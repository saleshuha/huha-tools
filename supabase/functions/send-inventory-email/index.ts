import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InventoryEmailRequest {
  inventory: any[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get JWT token and validate user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { inventory }: InventoryEmailRequest = await req.json();
    const userEmail = user.email; // Use authenticated user's email

    console.log('Sending inventory email to:', userEmail, 'Items count:', inventory.length);

    // Generate CSV data from inventory
    const csvHeaders = ['ASIN', 'Serial Number', 'Status', 'Quantity', 'Date Added', 'Notes'];
    const csvRows = inventory.map(item => [
      item.asin || item.skuNumber || '',
      item.serialNumber || item.binSerialNumber || '',
      item.status || '',
      item.quantity?.toString() || '0',
      item.dateAdded ? new Date(item.dateAdded).toLocaleDateString() : '',
      item.notes || ''
    ]);
    
    const csvData = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Determine inventory type from the data structure
    const inventoryType = inventory.length > 0 && inventory[0].asin ? 'ASIN' : 'SKU';
    
    const subject = `${inventoryType} Inventory Export - ${new Date().toLocaleDateString()}`;
    
    const emailResponse = await resend.emails.send({
      from: "Inventory System <onboarding@resend.dev>",
      to: [userEmail],
      subject: subject,
      html: `
        <h1>Your ${inventoryType} Inventory Export</h1>
        <p>Hello,</p>
        <p>Your inventory export has been generated and is attached to this email.</p>
        <p><strong>Export Details:</strong></p>
        <ul>
          <li>Type: ${inventoryType} Inventory</li>
          <li>Generated: ${new Date().toLocaleString()}</li>
          <li>Format: CSV</li>
          <li>Total Items: ${inventory.length}</li>
        </ul>
        <p>Best regards,<br>Your Inventory Management System</p>
      `,
      attachments: [{
        filename: `${inventoryType.toLowerCase()}-inventory-${new Date().toISOString().split('T')[0]}.csv`,
        content: btoa(csvData),
        type: 'text/csv',
        disposition: 'attachment'
      }]
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-inventory-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);