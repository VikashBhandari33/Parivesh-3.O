import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// Initialize the Google GenAI SDK
let ai: GoogleGenAI | null = null;
try {
  // @google/genai expects an empty config {} if using process.env.GEMINI_API_KEY implicitly
  ai = new GoogleGenAI({});
} catch (e) {
  console.warn("GoogleGenAI initialized without API key. Chatbot will fail until configured.");
}

const SYSTEM_INSTRUCTION = `
You are the official AI Navigation Assistant for the Parivesh 3.0 platform (Chhattisgarh Environment Conservation Board).
Your primary goal is to help Proponents navigate the site, understand the processes, and clear their doubts accurately.

**CRITICAL PLATFORM LINKS (USE THESE EXACT MARKDOWN LINKS IN YOUR RESPONSES):**
- To create a new application or apply for environmental clearance: [Click here to Apply](/apply)
- To view their main dashboard and tracked submissions: [Go to your Dashboard](/dashboard/proponent)
- To view compliance and EDS requirements: [View Compliance](/compliance)
- To review their user profile: [View Profile](/profile)

**DOCUMENT REQUIREMENTS CONTEXT:**
The platform accepts 5 major Project Categories. Here are the required documents for each. Use this to explicitly answer questions about what is needed.
- COMMON (All require these): Processing Fee Details, Pre-feasibility Report, Environmental Management Plan (EMP), Form 1 / CAF, Land Documents, CER Details, Affidavits.
- SAND MINING: District Survey Report, Sand Replenishment Study, Gram Panchayat NOC, 200m Certificate, 500m Certificate, Mining Plan Approval, KML File, Geo-tagged Photographs.
- LIMESTONE MINING: Lease Deed, Mining Plan Approval, Forest NOC, Water NOC, Compliance Report, Geo-tagged Photographs.
- BRICK KILN: Panchnama, Chimney Distance Certificate, Coal Usage Declaration, Plantation Compliance.
- INFRASTRUCTURE: Building Plan Approval, Traffic Impact Study, Groundwater Clearance, Solid Waste Management Plan, Fire NOC.
- INDUSTRY: Consent to Establish (CTE), Effluent Treatment Plan (ETP), Air Pollution Control Plan, Boiler/Furnace Details, Hazardous Waste Docs.

**TONE & RULES:**
- Be incredibly concise, polite, and helpful. Do NOT write giant essays.
- Use bold text and bullet points to make things easy to read.
- If someone asks where to go, ALWAYS provide the exact markdown link (e.g., \`[Apply Here](/apply)\`).
- If they ask about approval chances, tell them we have an AI Predictive Engine on the "Review & Submit" page of their application that calculates exact odds.
`;

router.post('/', authenticate, asyncHandler(async (req: any, res: any, next: any) => {
  if (!ai) {
    throw new AppError(500, 'The Chatbot is currently unavailable (Missing API Credentials).');
  }

  const { message, history = [] } = req.body;

  if (!message) {
    throw new AppError(400, 'Message is required.');
  }

  try {
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    let fullPrompt = "";
    if (formattedHistory.length > 0) {
      fullPrompt += "Previous Conversation:\\n";
      formattedHistory.forEach((h: any) => {
        fullPrompt += `${h.role}: ${h.parts[0].text}\\n`;
      });
      fullPrompt += `\\nCurrentUserMessage: ${message}`;
    } else {
      fullPrompt = message;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7
      }
    });

    res.json({
      role: 'assistant',
      content: response.text
    });

  } catch (error: any) {
    console.error("Gemini Chatbot Error:", error);
    throw new AppError(500, `Failed to communicate with AI Assistant. ${error.message || ''}`);
  }
}));

export default router;
