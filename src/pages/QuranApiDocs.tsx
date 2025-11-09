import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApiCodeBlock } from '@/components/sunsky/ApiCodeBlock';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BookOpen, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function QuranApiDocs() {
  const navigate = useNavigate();
  
  usePageTracking({
    category: 'Quran',
    subcategory: 'Documentation',
    pageTitle: 'Quran API Documentation'
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quran
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Quran API Documentation</h1>
              <p className="text-muted-foreground">
                Free, fast, and comprehensive Quran API
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant="secondary">Free & Open Source</Badge>
            <Badge variant="secondary">No Authentication Required</Badge>
            <Badge variant="secondary">Fast & Reliable</Badge>
          </div>
        </div>

        {/* Introduction */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Introduction</h2>
          <p className="text-muted-foreground mb-4">
            The Quran API provides programmatic access to the complete text of the Holy Quran with translations, 
            tafsir (commentary), and metadata. All endpoints are free to use and require no authentication.
          </p>
          <div className="flex items-center gap-4">
            <div>
              <strong>Base URL:</strong>
              <code className="ml-2 px-2 py-1 bg-muted rounded text-sm">
                https://quranapi.pages.dev/api
              </code>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="https://quranapi.pages.dev" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Official Docs
              </a>
            </Button>
          </div>
        </Card>

        {/* API Endpoints */}
        <div className="space-y-6">
          {/* Get All Surahs */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-500">GET</Badge>
              <code className="text-lg font-mono">/surah.json</code>
            </div>
            <h3 className="text-xl font-semibold mb-2">Get All Surahs</h3>
            <p className="text-muted-foreground mb-4">
              Retrieve a list of all 114 surahs with metadata including names, verse counts, and revelation type.
            </p>

            <Tabs defaultValue="request">
              <TabsList>
                <TabsTrigger value="request">Request</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="example">Example Code</TabsTrigger>
              </TabsList>

              <TabsContent value="request" className="mt-4">
                <ApiCodeBlock
                  code={`GET https://quranapi.pages.dev/api/surah.json`}
                  language="text"
                  title="HTTP Request"
                />
              </TabsContent>

              <TabsContent value="response" className="mt-4">
                <ApiCodeBlock
                  code={`[
  {
    "surahNumber": 1,
    "surahName": "Al-Fatihah",
    "surahNameArabic": "الفاتحة",
    "surahNameArabicLong": "سُورَةُ ٱلْفَاتِحَةِ",
    "surahNameTranslation": "The Opening",
    "totalVerses": 7,
    "revelationType": "Meccan"
  },
  // ... 113 more surahs
]`}
                  language="json"
                  title="JSON Response"
                />
              </TabsContent>

              <TabsContent value="example" className="mt-4">
                <ApiCodeBlock
                  code={`// Using fetch API
const response = await fetch('https://quranapi.pages.dev/api/surah.json');
const surahs = await response.json();

console.log(\`Total Surahs: \${surahs.length}\`);
surahs.forEach(surah => {
  console.log(\`\${surah.surahNumber}. \${surah.surahName} - \${surah.totalVerses} verses\`);
});`}
                  language="typescript"
                  title="JavaScript Example"
                />
              </TabsContent>
            </Tabs>
          </Card>

          {/* Get Surah by Number */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-500">GET</Badge>
              <code className="text-lg font-mono">/{'{surahNumber}'}.json</code>
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Surah by Number</h3>
            <p className="text-muted-foreground mb-4">
              Retrieve a complete surah with all verses, Arabic text, and translations.
            </p>

            <Tabs defaultValue="request">
              <TabsList>
                <TabsTrigger value="request">Request</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="example">Example Code</TabsTrigger>
              </TabsList>

              <TabsContent value="request" className="mt-4">
                <ApiCodeBlock
                  code={`GET https://quranapi.pages.dev/api/1.json

Parameters:
- surahNumber: Integer (1-114) - The surah number to retrieve`}
                  language="text"
                  title="HTTP Request"
                />
              </TabsContent>

              <TabsContent value="response" className="mt-4">
                <ApiCodeBlock
                  code={`{
  "surahNumber": 1,
  "surahName": "Al-Fatihah",
  "surahNameArabic": "الفاتحة",
  "totalVerses": 7,
  "revelationType": "Meccan",
  "verses": [
    {
      "surahNumber": 1,
      "ayahNumber": 1,
      "arabic1": "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ",
      "arabic2": "بسم الله الرحمن الرحيم",
      "translation": {
        "english": "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        "urdu": "شروع اللہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے"
      }
    }
    // ... more verses
  ]
}`}
                  language="json"
                  title="JSON Response"
                />
              </TabsContent>

              <TabsContent value="example" className="mt-4">
                <ApiCodeBlock
                  code={`// Get Surah Al-Fatihah
const surahNumber = 1;
const response = await fetch(\`https://quranapi.pages.dev/api/\${surahNumber}.json\`);
const surah = await response.json();

console.log(\`Surah: \${surah.surahName}\`);
console.log(\`Total Verses: \${surah.totalVerses}\`);

surah.verses.forEach(verse => {
  console.log(\`\${verse.ayahNumber}. \${verse.arabic1}\`);
  console.log(\`   \${verse.translation.english}\`);
});`}
                  language="typescript"
                  title="JavaScript Example"
                />
              </TabsContent>
            </Tabs>
          </Card>

          {/* Get Single Verse */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-500">GET</Badge>
              <code className="text-lg font-mono">/{'{surahNumber}'}/{'{ayahNumber}'}.json</code>
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Single Verse</h3>
            <p className="text-muted-foreground mb-4">
              Retrieve a specific verse with Arabic text and translations.
            </p>

            <Tabs defaultValue="request">
              <TabsList>
                <TabsTrigger value="request">Request</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="example">Example Code</TabsTrigger>
              </TabsList>

              <TabsContent value="request" className="mt-4">
                <ApiCodeBlock
                  code={`GET https://quranapi.pages.dev/api/2/255.json

Parameters:
- surahNumber: Integer (1-114) - The surah number
- ayahNumber: Integer (1-max verses) - The verse number`}
                  language="text"
                  title="HTTP Request"
                />
              </TabsContent>

              <TabsContent value="response" className="mt-4">
                <ApiCodeBlock
                  code={`{
  "surahNumber": 2,
  "ayahNumber": 255,
  "arabic1": "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡحَىُّ ٱلۡقَيُّومُ...",
  "arabic2": "الله لا إله إلا هو الحي القيوم...",
  "translation": {
    "english": "Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence...",
    "urdu": "اللہ کے سوا کوئی معبود نہیں، زندہ ہے قائم رہنے والا..."
  }
}`}
                  language="json"
                  title="JSON Response"
                />
              </TabsContent>

              <TabsContent value="example" className="mt-4">
                <ApiCodeBlock
                  code={`// Get Ayatul Kursi (2:255)
const response = await fetch('https://quranapi.pages.dev/api/2/255.json');
const verse = await response.json();

console.log(\`Quran \${verse.surahNumber}:\${verse.ayahNumber}\`);
console.log(verse.arabic1);
console.log(verse.translation.english);`}
                  language="typescript"
                  title="JavaScript Example"
                />
              </TabsContent>
            </Tabs>
          </Card>

          {/* Get Tafsir */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-green-500">GET</Badge>
              <code className="text-lg font-mono">/tafsir/{'{surahNumber}'}/{'{ayahNumber}'}.json</code>
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Verse Tafsir (Commentary)</h3>
            <p className="text-muted-foreground mb-4">
              Retrieve detailed commentary for a specific verse from multiple scholars.
            </p>

            <Tabs defaultValue="request">
              <TabsList>
                <TabsTrigger value="request">Request</TabsTrigger>
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="example">Example Code</TabsTrigger>
              </TabsList>

              <TabsContent value="request" className="mt-4">
                <ApiCodeBlock
                  code={`GET https://quranapi.pages.dev/api/tafsir/1/1.json

Parameters:
- surahNumber: Integer (1-114) - The surah number
- ayahNumber: Integer (1-max verses) - The verse number`}
                  language="text"
                  title="HTTP Request"
                />
              </TabsContent>

              <TabsContent value="response" className="mt-4">
                <ApiCodeBlock
                  code={`[
  {
    "surahNumber": 1,
    "ayahNumber": 1,
    "tafsirName": "Ibn Kathir",
    "text": "This is the detailed commentary from Ibn Kathir explaining the verse..."
  },
  {
    "surahNumber": 1,
    "ayahNumber": 1,
    "tafsirName": "Maarif Ul Quran",
    "text": "This is the detailed commentary from Maarif Ul Quran..."
  },
  {
    "surahNumber": 1,
    "ayahNumber": 1,
    "tafsirName": "Tazkirul Quran",
    "text": "This is the detailed commentary from Tazkirul Quran..."
  }
]`}
                  language="json"
                  title="JSON Response"
                />
              </TabsContent>

              <TabsContent value="example" className="mt-4">
                <ApiCodeBlock
                  code={`// Get tafsir for the first verse
const response = await fetch('https://quranapi.pages.dev/api/tafsir/1/1.json');
const tafsirs = await response.json();

tafsirs.forEach(tafsir => {
  console.log(\`\n--- \${tafsir.tafsirName} ---\`);
  console.log(tafsir.text);
});`}
                  language="typescript"
                  title="JavaScript Example"
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Features */}
        <Card className="p-6 mt-6">
          <h2 className="text-2xl font-bold mb-4">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">✅ No Authentication</h3>
              <p className="text-sm text-muted-foreground">
                Access all endpoints without API keys or registration
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">✅ Complete Quran Text</h3>
              <p className="text-sm text-muted-foreground">
                All 114 surahs with full Arabic text and Tashkeel
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">✅ Multiple Translations</h3>
              <p className="text-sm text-muted-foreground">
                English and Urdu translations included
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">✅ Tafsir Support</h3>
              <p className="text-sm text-muted-foreground">
                3 comprehensive tafsir sources available
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">✅ Fast & Reliable</h3>
              <p className="text-sm text-muted-foreground">
                Hosted on Cloudflare Pages for global performance
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">✅ CORS Enabled</h3>
              <p className="text-sm text-muted-foreground">
                Use directly from browser-based applications
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
