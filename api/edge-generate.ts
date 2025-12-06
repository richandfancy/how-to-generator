import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { fullPrompt, title, content } = await req.json();

        // 1. Env Vars
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!GEMINI_API_KEY) {
            return new Response(JSON.stringify({
                error: 'GEMINI_API_KEY not configured',
                details: 'Please add GEMINI_API_KEY to your env variables.'
            }), { status: 500 });
        }

        // 2. Initialize Clients
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const imageModel = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' });

        // 3. Generate Image
        const imageStartTime = Date.now();
        const imageResult = await imageModel.generateContent(fullPrompt);
        const imageResponse = imageResult.response;
        const imageTime = ((Date.now() - imageStartTime) / 1000).toFixed(2);

        let imageUrl = null;
        let fileSize = '0 KB';

        // 4. Process Result
        if (imageResponse.candidates &&
            imageResponse.candidates[0].content &&
            imageResponse.candidates[0].content.parts &&
            imageResponse.candidates[0].content.parts[0].inlineData) {

            const part = imageResponse.candidates[0].content.parts[0];
            const dataBase64 = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;
            const ext = mimeType.split('/')[1] || 'png';

            // Convert base64 to ArrayBuffer for upload
            const binaryString = atob(dataBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const buffer = bytes.buffer;

            const filename = `howto_${Date.now()}.${ext}`;

            // 5. Upload to Supabase (if configured)
            if (SUPABASE_URL && SUPABASE_ANON_KEY) {
                const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                const { data, error } = await supabase.storage
                    .from('images')
                    .upload(filename, buffer, {
                        contentType: mimeType,
                        upsert: false
                    });

                if (error) {
                    console.error('Supabase upload error:', error);
                    // Fallback to Data URI if upload fails
                    imageUrl = `data:${mimeType};base64,${dataBase64}`;
                    fileSize = (len / 1024).toFixed(2) + ' KB';
                } else {
                    const { data: publicData } = supabase.storage
                        .from('images')
                        .getPublicUrl(filename);

                    imageUrl = publicData.publicUrl;
                    fileSize = (len / 1024).toFixed(2) + ' KB';
                }
            } else {
                // Fallback to Data URI if no Supabase
                imageUrl = `data:${mimeType};base64,${dataBase64}`;
                fileSize = (len / 1024).toFixed(2) + ' KB';
            }

            return new Response(JSON.stringify({
                success: true,
                imageUrl,
                debug: {
                    imageTime: `${imageTime}s`,
                    fileSize,
                    runtime: 'edge'
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } else {
            throw new Error('No image data received from Gemini');
        }

    } catch (error: any) {
        console.error('Edge generation error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to generate image',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
