import {NextResponse} from 'next/server';

import {summarizeDocument} from '@/ai/flows/summarize-document';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const {fileContent} = await request.json();

    if (!fileContent) {
      return NextResponse.json(
        {error: 'Missing file content'},
        {status: 400}
      );
    }
    console.log('API /api/summarize-document received.');

    const aiResponse = await summarizeDocument({fileContent});
    const aiText = aiResponse.summary;

    if (!aiText) {
      throw new Error('AI failed to generate a summary.');
    }

    return NextResponse.json({summary: aiText});
  } catch (error: any) {
    console.error('API Error in /api/summarize-document:', error);
    return NextResponse.json(
      {error: 'Failed to process summarization request'},
      {status: 500}
    );
  }
}

export async function GET() {
  return NextResponse.json({message: 'Method Not Allowed'}, {status: 405});
}
