import { NextResponse } from 'next/server';
import { chatWithDocument } from '@/ai/flows/chat-with-document';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentContent, userMessage } = body;

    if (!documentContent || !userMessage) {
      return NextResponse.json(
        { error: 'Missing document content or user message' },
        { status: 400 }
      );
    }

    console.log('API /api/chat-with-document received:');
    console.log('User Message:', userMessage);

    const aiResponse = await chatWithDocument({ documentContent, userMessage });
    const aiText = aiResponse.response;

    if (!aiText) {
      throw new Error("AI failed to generate a response.");
    }

    return NextResponse.json({ response: aiText });

  } catch (error: any) {
    console.error('API Error in /api/chat-with-document:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
}
