// src/app/api/chat-with-document/route.ts
import { NextResponse } from 'next/server';
import { chatWithDocument } from '@/ai/flows/chat-with-document';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Destructure, accepting documentContent as 'any' for now
    const { documentContent, userMessage } = body;

    // Basic validation
    if (documentContent === undefined || !userMessage) { // Check if documentContent exists at all
      return NextResponse.json(
        { error: 'Missing document content or user message' },
        { status: 400 }
      );
    }

    console.log('API /api/chat-with-document received:');
    console.log('User Message:', userMessage);
    // Log the type of documentContent for debugging
    console.log('Document Content Type:', typeof documentContent);
    if (typeof documentContent === 'object' && documentContent !== null) {
        console.log('Document Content Keys:', Object.keys(documentContent));
         if(documentContent.type === 'image') console.log('Image data length:', documentContent.data?.length);
    }


    // Pass the potentially complex documentContent directly to the flow
    const aiResponse = await chatWithDocument({ documentContent, userMessage });

    if (!aiResponse || aiResponse.response === undefined) {
        throw new Error("AI flow failed to return a valid response object.");
    }

     // Check if the response indicates an error from the flow itself
     if (aiResponse.response.startsWith('*Error:') || aiResponse.response.startsWith('*Assistant Response Error:') || aiResponse.response.startsWith('*Assistant Response Blocked:')) {
        // Log the specific AI-side error but return a generic message to the client
        console.error("AI Flow Error Response:", aiResponse.response);
        return NextResponse.json(
            { error: 'Failed to get a valid response from AI.', details: aiResponse.response },
            { status: 500 }
        );
    }

    return NextResponse.json({ response: aiResponse.response });

  } catch (error: any) {
    console.error('API Error in /api/chat-with-document:', error);
    // Avoid leaking detailed internal errors to the client unless intended
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to process chat request', details: message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}
