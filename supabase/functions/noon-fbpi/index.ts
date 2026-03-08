import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOON_BASE_URL = "https://noon-api-gateway.noon.partners";

function base64url(input: Uint8Array): string {
  let binary = "";
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function strToUint8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

async function signRS256JWT(
  privateKeyPem: string,
  keyId: string,
  projectCode: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: keyId };
  const payload = {
    iss: projectCode,
    iat: now,
    exp: now + 300,
  };

  const headerB64 = base64url(strToUint8(JSON.stringify(header)));
  const payloadB64 = base64url(strToUint8(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the PEM private key
  const pemContents = privateKeyPem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, "")
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    strToUint8(signingInput)
  );

  const sigB64 = base64url(new Uint8Array(signature));
  return `${signingInput}.${sigB64}`;
}

async function authenticateWithNoon(
  privateKey: string,
  keyId: string,
  projectCode: string
): Promise<string> {
  const jwt = await signRS256JWT(privateKey, keyId, projectCode);

  const response = await fetch(
    `${NOON_BASE_URL}/identity/public/v1/api/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: jwt }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Noon auth failed (${response.status}): ${text}`);
  }

  // Extract session cookie
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    // Some environments return the token in the body
    const body = await response.json();
    if (body?.result?.token) return body.result.token;
    throw new Error("No session cookie or token returned from Noon");
  }

  return setCookie;
}

async function getOrder(
  sessionCookie: string,
  fbpiOrderNr: string
): Promise<any> {
  const response = await fetch(
    `${NOON_BASE_URL}/fbpi/v1/fbpi-order/${fbpiOrderNr}/get`,
    {
      method: "GET",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Get order failed (${response.status}): ${text}`);
  }

  return await response.json();
}

async function updateOrder(
  sessionCookie: string,
  updatePayload: any
): Promise<any> {
  const response = await fetch(
    `${NOON_BASE_URL}/fbpi/v1/fbpi-order/update`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatePayload),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Update order failed (${response.status}): ${text}`);
  }

  return await response.json();
}

async function createShipment(
  sessionCookie: string,
  shipmentPayload: any
): Promise<any> {
  const response = await fetch(
    `${NOON_BASE_URL}/fbpi/v1/shipment/create`,
    {
      method: "POST",
      headers: {
        Cookie: sessionCookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shipmentPayload),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Create shipment failed (${response.status}): ${text}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const body = await req.json();
    const { action, store_id, fbpi_order_nr, update_payload, shipment_payload } = body;

    // Get store credentials
    const { data: store, error: storeError } = await supabase
      .from("noon_stores_config")
      .select("*")
      .eq("id", store_id)
      .eq("user_id", userId)
      .single();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: "Store not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!store.api_private_key || !store.api_key_id || !store.api_project_code) {
      return new Response(
        JSON.stringify({
          error: "Store API credentials not configured. Please add private key, key ID, and project code in settings.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Authenticate with Noon
    const sessionCookie = await authenticateWithNoon(
      store.api_private_key,
      store.api_key_id,
      store.api_project_code
    );

    let result: any;

    switch (action) {
      case "test-connection": {
        result = { success: true, message: "Successfully authenticated with Noon API" };
        break;
      }

      case "get-order": {
        if (!fbpi_order_nr) {
          return new Response(
            JSON.stringify({ error: "fbpi_order_nr is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        const orderData = await getOrder(sessionCookie, fbpi_order_nr);

        // Check inventory for each item
        const items = orderData?.result?.items || [];
        const inventoryStatus: Record<string, any> = {};

        for (const item of items) {
          const sku = item.partnerSku || item.partner_sku;
          if (sku) {
            const { data: invItems } = await supabase
              .from("asin_inventory")
              .select("id, sku, quantity, title, asin, status")
              .eq("user_id", userId)
              .eq("sku", sku)
              .eq("is_active", true);

            const totalQty = (invItems || []).reduce(
              (sum: number, i: any) => sum + (i.quantity || 0),
              0
            );
            const orderQty = item.quantity || 1;

            inventoryStatus[sku] = {
              available_qty: totalQty,
              order_qty: orderQty,
              status:
                totalQty >= orderQty
                  ? "in_stock"
                  : totalQty > 0
                  ? "low_stock"
                  : "out_of_stock",
              inventory_items: invItems || [],
            };
          }
        }

        // Save to noon_fbpi_orders
        const orderRecord = {
          user_id: userId,
          store_id: store_id,
          fbpi_order_nr: fbpi_order_nr,
          mp_order_nr: orderData?.result?.mpOrderNr || null,
          mp_code: orderData?.result?.mpCode || null,
          mp_country_code: orderData?.result?.mpCountryCode || null,
          warehouse_code: orderData?.result?.warehouseCode || store.warehouse_code,
          currency_code: orderData?.result?.currencyCode || null,
          items: items,
          inventory_status: inventoryStatus,
          status: "fetched",
          order_created_at: orderData?.result?.createdAt || null,
          fetched_at: new Date().toISOString(),
        };

        const { data: savedOrder, error: saveError } = await supabase
          .from("noon_fbpi_orders")
          .upsert(orderRecord, { onConflict: "fbpi_order_nr,user_id" })
          .select()
          .single();

        result = {
          order: orderData?.result || orderData,
          inventory_status: inventoryStatus,
          saved: savedOrder,
        };
        break;
      }

      case "update-order": {
        if (!update_payload) {
          return new Response(
            JSON.stringify({ error: "update_payload is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await updateOrder(sessionCookie, update_payload);
        break;
      }

      case "create-shipment": {
        if (!shipment_payload) {
          return new Response(
            JSON.stringify({ error: "shipment_payload is required" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        result = await createShipment(sessionCookie, shipment_payload);
        break;
      }

      case "check-inventory": {
        // Just check inventory for given SKUs without calling Noon API
        const skus = body.skus || [];
        const inventoryResults: Record<string, any> = {};

        for (const sku of skus) {
          const { data: invItems } = await supabase
            .from("asin_inventory")
            .select("id, sku, quantity, title, asin, status")
            .eq("user_id", userId)
            .eq("sku", sku)
            .eq("is_active", true);

          const totalQty = (invItems || []).reduce(
            (sum: number, i: any) => sum + (i.quantity || 0),
            0
          );

          inventoryResults[sku] = {
            available_qty: totalQty,
            status: totalQty > 0 ? "in_stock" : "out_of_stock",
            inventory_items: invItems || [],
          };
        }

        result = { inventory: inventoryResults };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("noon-fbpi error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
