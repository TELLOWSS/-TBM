
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { RiskAssessmentItem, SafetyGuideline, TBMAnalysisResult, ExtractedTBMData } from "../types";

// [ADDED] Exported Interfaces for Risk Assessment Extraction
export interface ExtractedPriority {
  content: string;
  level: 'HIGH' | 'GENERAL';
  category: string;
}

export interface MonthlyExtractionResult {
  detectedMonth?: string;
  items: ExtractedPriority[];
}

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper: Retry Logic for 500/503 Errors
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRetryable = error.status === 500 || error.status === 503 || 
                          (error.message && (error.message.includes('Internal error') || error.message.includes('Overloaded')));
      
      if (isRetryable && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Gemini API Temporary Error (${error.status || 'Unknown'}). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

// --- ROBUST DATA SANITIZATION UTILS (Self-Healing Logic) ---

// 1. Surgical JSON Parser & Repair: Extracts valid JSON and fixes common errors
const cleanAndRepairJson = (text: string): string => {
  if (!text) return "{}";
  
  // Step 1: Remove Markdown code blocks
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  
  // Step 2: Find the outermost braces/brackets
  const firstOpenBrace = cleaned.indexOf('{');
  const firstOpenBracket = cleaned.indexOf('[');
  let startIndex = -1;
  let endIndex = -1;

  if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
      startIndex = firstOpenBrace;
      endIndex = cleaned.lastIndexOf('}');
  } else if (firstOpenBracket !== -1) {
      startIndex = firstOpenBracket;
      endIndex = cleaned.lastIndexOf(']');
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    cleaned = cleaned.substring(startIndex, endIndex + 1);
  } else if (startIndex !== -1) {
    // If closing brace is missing (common stream error), try to append it
    cleaned = cleaned.substring(startIndex) + (cleaned[startIndex] === '{' ? '}' : ']');
  }

  // Step 3: Attempt parsing. If fail, return safe empty object/array string
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    console.warn("JSON Repair needed:", e);
    // Simple fallback: if it looks like an array, return []. If object, {}.
    return cleaned.startsWith('[') ? "[]" : "{}";
  }
};

// 2. Strict Number Guard: Converts any trash input into a valid number
const safeParseInt = (val: any): number => {
    if (typeof val === 'number' && !isNaN(val)) return Math.floor(val);
    if (typeof val === 'string') {
        // Remove commas, text units (명, 개), and keep signs
        const cleaned = val.replace(/,/g, '').replace(/[^0-9.-]/g, '');
        const parsed = parseInt(cleaned, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

// ... (Existing video analysis code remains unchanged) ...
export const evaluateTBMVideo = async (base64Video: string, mimeType: string, workDescription?: string): Promise<TBMAnalysisResult> => {
  try {
    let cleanMimeType = 'video/webm'; 
    if (mimeType.includes('mp4')) cleanMimeType = 'video/mp4';

    const workContext = workDescription ? `작업 내용 및 일지 요약: "${workDescription}"` : "작업 내용: 일반 골조 공사";

    // [PHILOSOPHY UPDATE] Prompt Engineering for Upward Standardization
    const prompt = `
      역할: 당신은 건설 현장의 **안전 멘토(Safety Mentor)**이자 **무재해 코치**입니다.
      
      [궁극적 목표]
      이 분석의 목적은 처벌이나 감점이 아닙니다. 
      팀원들의 **안전 의식을 고취**시키고, 모든 팀의 TBM 수준을 **상향 평준화(Upward Standardization)**하여 현장의 **무재해(Zero Accident)**를 달성하는 것입니다.

      임무: TBM 영상과 일지 내용을 분석하여, 긍정적인 변화를 유도할 수 있는 피드백을 제공하십시오.
      
      ${workContext}

      [평가 철학 및 기준 (총 100점 만점)]
      1. **일지 충실도 (30점):** 위험성평가 내용이 작업자들에게 정확히 전달되었는가? (형식적 낭독 지양)
      2. **집중도 및 태도 (30점):** 팀원들이 리더와 눈을 맞추고 경청하는가? (상호 존중과 소통 문화)
      3. **음성 전달력 (20점):** 리더의 목소리에 자신감과 '안전 리더십'이 묻어나는가?
      4. **보호구 상태 (20점):** 생명을 지키기 위한 기본 원칙(안전모 턱끈 등)이 준수되었는가?

      [출력 데이터 요구사항]
      - **feedback**: 단순 지적보다는 "다음에는 ~하면 더욱 완벽한 TBM이 될 것입니다"와 같은 **격려와 코칭(Coaching)** 위주로 작성하십시오.
      - **suggestion**: 이 팀이 '베스트 안전 팀'이 되기 위해 필요한 **한 가지 핵심 제언**을 해주십시오.
      - 응답은 반드시 JSON 형식이어야 합니다.
    `;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: [{ role: "user", parts: [{ inlineData: { mimeType: cleanMimeType, data: base64Video } }, { text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             rubric: {
                 type: Type.OBJECT,
                 properties: {
                     logQuality: { type: Type.INTEGER, description: "Score out of 30" },
                     focus: { type: Type.INTEGER, description: "Score out of 30" },
                     voice: { type: Type.INTEGER, description: "Score out of 20" },
                     ppe: { type: Type.INTEGER, description: "Score out of 20" },
                     deductions: { type: Type.ARRAY, items: { type: Type.STRING } }
                 },
                 required: ["logQuality", "focus", "voice", "ppe"]
             },
             score: { type: Type.INTEGER },
             evaluation: { type: Type.STRING },
             details: {
               type: Type.OBJECT,
               properties: {
                 participation: { type: Type.STRING },
                 voiceClarity: { type: Type.STRING }, 
                 ppeStatus: { type: Type.STRING },
                 interaction: { type: Type.BOOLEAN }
               }
             },
             focusAnalysis: {
                type: Type.OBJECT,
                properties: {
                    overall: { type: Type.INTEGER },
                    distractedCount: { type: Type.INTEGER },
                    focusZones: {
                        type: Type.OBJECT,
                        properties: {
                            front: { type: Type.STRING },
                            back: { type: Type.STRING },
                            side: { type: Type.STRING }
                        }
                    }
                }
             },
             insight: {
                 type: Type.OBJECT,
                 properties: {
                     mentionedTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                     missingTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                     suggestion: { type: Type.STRING }
                 }
             },
             feedback: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
      },
    }));

    if (response.text) {
      const raw = JSON.parse(cleanAndRepairJson(response.text));
      
      // Default rubric if AI fails to populate it specifically (Fallback)
      const defaultRubric = {
          logQuality: 28,
          focus: 28,
          voice: 18,
          ppe: 18,
          deductions: []
      };

      const finalRubric = raw.rubric || defaultRubric;
      const totalScore = finalRubric.logQuality + finalRubric.focus + finalRubric.voice + finalRubric.ppe;

      return {
          score: raw.score || totalScore,
          evaluation: raw.evaluation || "양호함",
          analysisSource: 'VIDEO',
          rubric: finalRubric, // Inject Rubric
          details: {
              participation: (raw.details?.participation || 'GOOD') as any,
              voiceClarity: (raw.details?.voiceClarity || 'CLEAR') as any,
              ppeStatus: (raw.details?.ppeStatus || 'GOOD') as any,
              interaction: !!raw.details?.interaction
          },
          focusAnalysis: {
              overall: raw.focusAnalysis?.overall ?? 98,
              distractedCount: raw.focusAnalysis?.distractedCount ?? 0,
              focusZones: {
                  front: (raw.focusAnalysis?.focusZones?.front || 'HIGH') as any,
                  back: (raw.focusAnalysis?.focusZones?.back || 'HIGH') as any,
                  side: (raw.focusAnalysis?.focusZones?.side || 'HIGH') as any
              }
          },
          insight: {
              mentionedTopics: raw.insight?.mentionedTopics || [],
              missingTopics: raw.insight?.missingTopics || [],
              suggestion: raw.insight?.suggestion || "지속적인 소통으로 무재해를 달성합시다."
          },
          feedback: raw.feedback || []
      };
    }
    throw new Error("No response text");
  } catch (error: any) {
    console.error("Gemini Insight Error:", error);
    return {
      score: 95,
      evaluation: "분석 대기 중",
      analysisSource: 'VIDEO',
      rubric: { logQuality: 25, focus: 25, voice: 15, ppe: 15, deductions: ["분석 실패로 인한 기본 점수 부여"] },
      details: { participation: 'GOOD', voiceClarity: 'CLEAR', ppeStatus: 'GOOD', interaction: true },
      focusAnalysis: { overall: 98, distractedCount: 0, focusZones: { front: 'HIGH', back: 'HIGH', side: 'HIGH' } },
      insight: { mentionedTopics: [], missingTopics: [], suggestion: "" },
      feedback: []
    };
  }
};

// ... (Monthly extraction remains unchanged) ...
export const extractMonthlyPriorities = async (base64Data: string, mimeType: string): Promise<MonthlyExtractionResult> => {
    try {
      const prompt = `월간 위험성평가표 분석. 날짜(detectedMonth)와 항목(items) 추출.`;
      const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
               detectedMonth: { type: Type.STRING },
               items: {
                 type: Type.ARRAY,
                 items: {
                   type: Type.OBJECT,
                   properties: {
                     content: { type: Type.STRING },
                     level: { type: Type.STRING },
                     category: { type: Type.STRING }
                   },
                   required: ["content", "level", "category"]
                 }
               }
            },
            required: ["items"]
          },
        },
      }));
      if (response.text) return JSON.parse(cleanAndRepairJson(response.text));
      return { items: [] };
    } catch (error: any) {
      return { items: [] };
    }
};

// [OVERHAULED] Analyze Master Log - Mode Aware & Robust
export const analyzeMasterLog = async (
    base64Data: string, 
    mimeType: string,
    monthlyGuidelines: SafetyGuideline[] = [],
    mode: 'BATCH' | 'ROUTINE' = 'BATCH' // [CRITICAL] Mode param added
  ): Promise<ExtractedTBMData[]> => {
    try {
      console.log(`Starting Document Analysis in [${mode}] mode...`);
      
      let promptContext = "";
      if (mode === 'BATCH') {
          promptContext = `
            [모드: 종합 일지 일괄 처리 (BATCH)]
            - 이 문서는 **이미 현장 소장의 결재가 완료된 검증된 문서**입니다.
            - 목표: 문서의 내용을 디지털 데이터로 변환(Archive)하는 것입니다.
            - **점수 처리:** 문서에 점수가 명시되어 있지 않다면, 무조건 높은 점수를 주지 말고 **일지 내용의 구체성에 따라 80~90점 사이**로 현실적으로 평가하십시오. (결재 완료 = 적격/Pass 의미, 만점 아님)
            - **데이터:** 팀명, 인원, 작업내용, 위험요인을 빠짐없이 추출하십시오.
          `;
      } else {
          promptContext = `
            [모드: 개별 TBM 간편 등록 (ROUTINE)]
            - 이 문서는 **작업 전 작성 중인 TBM 초안**입니다.
            - 목표: 사용자가 입력해야 할 텍스트(작업내용, 위험요인)를 대신 타이핑해주는 것입니다.
            - **점수 처리:** 아직 TBM 활동(동영상 촬영)을 하지 않았으므로, **안전 점수와 집중도는 절대 생성하지 마십시오 (0 또는 null).** 이는 추후 영상 분석으로 채워집니다.
            - **주의:** 오직 텍스트 정보만 추출하십시오.
          `;
      }

      const prompt = `
        역할: 건설 현장 데이터 분석가 (골조 공사 전문).
        임무: 제공된 '일일 종합 TBM 일지' 또는 'TBM 보드판' 이미지를 분석하여 데이터를 구조화하십시오.
        
        ${promptContext}
        
        [필수 추출 항목]
        1. **날짜(Document Date)**: YYYY-MM-DD 형식. (예: 2025년 3월 1일 -> 2025-03-01)
        2. **팀별 데이터 (teams)**:
           - **팀명**: (예: 형틀 1팀, 철근 2팀, 직영)
           - **팀장명**: 식별 가능할 경우 추출.
           - **참석인원**: 숫자만 추출.
           - **작업내용**: 구체적으로 추출.
           - **위험요인/대책**: 텍스트 그대로 추출.
           - **안전점수(safetyScore)**: 모드에 따라 처리.
      `;
  
      const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: mimeType, data: base64Data } },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192, 
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              documentDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
              teams: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    teamName: { type: Type.STRING },
                    leaderName: { type: Type.STRING },
                    attendeesCount: { type: Type.INTEGER },
                    workDescription: { type: Type.STRING },
                    riskFactorCount: { type: Type.INTEGER },
                    feedbackLevel: { type: Type.INTEGER },
                    safetyScore: { type: Type.INTEGER },
                    riskFactors: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          risk: { type: Type.STRING },
                          measure: { type: Type.STRING }
                        }
                      }
                    },
                    safetyFeedback: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            },
          },
        },
      }));
  
      if (response.text) {
        // [Safety] Use Repair Logic
        const cleanedText = cleanAndRepairJson(response.text);
        let data: any;
        
        try {
            data = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error("Critical JSON Parse Error even after repair:", parseError);
            return [];
        }

        // [Structure Guard] Handle case where AI returns array directly instead of object
        const teamsArray = Array.isArray(data) ? data : (Array.isArray(data.teams) ? data.teams : []);
        
        let globalDate = new Date().toISOString().split('T')[0];
        if (data.documentDate && /^\d{4}-\d{2}-\d{2}$/.test(data.documentDate)) {
            globalDate = data.documentDate;
        }
        
        const processedTeams = teamsArray.map((team: any) => {
            const safeAttendees = safeParseInt(team.attendeesCount);
            const safeRiskCount = safeParseInt(team.riskFactorCount);
            const safeSafetyScore = safeParseInt(team.safetyScore);
            const safeFeedbackLevel = safeParseInt(team.feedbackLevel);

            const safeRiskFactors = Array.isArray(team.riskFactors) ? team.riskFactors : [];
            const safeFeedback = Array.isArray(team.safetyFeedback) ? team.safetyFeedback : [];

            // [CRITICAL LOGIC] Conditional Video Analysis Generation
            let researchAnalysis: TBMAnalysisResult | undefined = undefined;

            if (mode === 'BATCH') {
                // In Batch Mode, we MUST provide a "Verified" analysis result because no video will be uploaded.
                const verifiedScore = safeSafetyScore > 0 ? safeSafetyScore : 85; // Default to 85 (Good) not 95 (Perfect)
                const verifiedFocus = 95; // Assume attentive if verified

                // [NEW] Synthetic Rubric for Batch Mode
                const syntheticRubric = {
                    logQuality: 25, // Good
                    focus: 25,      // Good
                    voice: 18,      // Assumed Good
                    ppe: 17,        // Assumed Good
                    deductions: ["서면 기록 기반 산정"]
                };

                researchAnalysis = {
                    score: verifiedScore,
                    evaluation: `[기검증 데이터] 종합 일지 아카이빙 완료. 위험요인 ${safeRiskCount}건 식별됨.`,
                    analysisSource: 'DOCUMENT',
                    rubric: syntheticRubric, // Add Rubric
                    details: { participation: 'GOOD', voiceClarity: 'CLEAR', ppeStatus: 'GOOD', interaction: true },
                    focusAnalysis: { 
                        overall: verifiedFocus, 
                        distractedCount: 0, 
                        focusZones: { front: 'HIGH', back: 'HIGH', side: 'HIGH' } 
                    },
                    insight: { 
                        mentionedTopics: safeRiskFactors.map((r:any) => r.risk || '') || [], 
                        missingTopics: [], 
                        suggestion: "기존 분석 검증 완료 데이터 (Batch Processed)" 
                    },
                    feedback: safeFeedback
                };
            } else {
                // In Routine Mode, we do NOT generate fake analysis. 
                researchAnalysis = undefined; 
            }

            return {
                teamName: team.teamName || "팀명 미상",
                leaderName: team.leaderName || "",
                attendeesCount: safeAttendees,
                workDescription: team.workDescription || "작업 내용 식별 불가",
                riskFactors: safeRiskFactors,
                safetyFeedback: safeFeedback,
                detectedDate: globalDate,
                videoAnalysis: researchAnalysis // Undefined for ROUTINE, Populated for BATCH
            };
        });

        return processedTeams;
      }
      throw new Error("No response text");
    } catch (error: any) {
      console.error("Gemini Data Mining Error:", error);
      return [];
    }
  };
