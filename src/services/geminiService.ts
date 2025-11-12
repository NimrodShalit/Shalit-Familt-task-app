
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import type { User, Task } from '../types';

// FIX: Switched from `import.meta.env.VITE_GEMINI_API_KEY` to `process.env.API_KEY`
// to align with the Gemini API coding guidelines and resolve TypeScript errors.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API key not found. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const getCreateTaskFunctionDeclaration = (users: User[]): FunctionDeclaration => {
  const userNames = users.map(u => u.name);
  return {
    name: 'createTask',
    description: 'יוצר משימה עם הפרטים שחולצו מהטקסט.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'שם המשימה, למשל "לקנות חלב".' },
        description: { type: Type.STRING, description: 'תיאור מפורט יותר של המשימה, אם סופק.' },
        assigneeName: { type: Type.STRING, description: `למי מיועדת המשימה. השתמש בשם מהרשימה: [${userNames.join(', ')}]. אם נאמר "שנינו" או "כולנו", השתמש ב-'all'. ברירת המחדל היא '${userNames[0]}'.` },
        dateTime: { type: Type.STRING, description: `תאריך ושעת המשימה בפורמט ISO 8601. פרש ביטויים כמו "מחר בערב".` },
        isRepeating: { type: Type.BOOLEAN, description: 'האם המשימה חוזרת, למשל אם נאמר "כל שבוע".' },
        reminder: { type: Type.STRING, description: `מתי להזכיר. ערכים אפשריים: 'none', '5m', '10m', '15m', '30m', '1h', '1d'. פרש "תזכורת 10 דקות לפני" ל-'10m'. ברירת המחדל היא '10m'.` },
        syncWithCalendar: { type: Type.BOOLEAN, description: 'האם להוסיף ליומן גוגל. ברירת המחדל היא true.' },
      },
      required: ['title'],
    },
  };
};

const getUpdateTaskFunctionDeclaration = (users: User[]): FunctionDeclaration => {
    const userNames = users.map(u => u.name);
    return {
      name: 'updateTask',
      description: 'מעדכן שדות ספציפיים של משימה קיימת על סמך הטקסט. רק השדות שהמשתמש ביקש לשנות צריכים להיכלל.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'שם המשימה החדש.' },
          description: { type: Type.STRING, description: 'התיאור החדש של המשימה.' },
          assigneeName: { type: Type.STRING, description: `האדם החדש שהמשימה מיועדת לו מהרשימה: [${userNames.join(', ')}, all].` },
          dateTime: { type: Type.STRING, description: `התאריך והשעה החדשים בפורמט ISO 8601.` },
          isRepeating: { type: Type.BOOLEAN, description: 'הסטטוס החדש של חזרתיות המשימה.' },
          reminder: { type: Type.STRING, description: `זמן התזכורת החדש. ערכים אפשריים: 'none', '5m', '10m', '15m', '30m', '1h', '1d'.`},
          syncWithCalendar: { type: Type.BOOLEAN, description: 'הסטטוס החדש של סנכרון עם יומן גוגל.' },
        },
      },
    };
};

const processGeminiResponse = (response: any, users: User[]): any => {
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const { name, args } = functionCalls[0];
      if (name === 'createTask' || name === 'updateTask') {
        if (args.assigneeName) {
          const assigneeNameLower = args.assigneeName.toLowerCase();
          if (assigneeNameLower === 'all' || assigneeNameLower === 'כולם' || assigneeNameLower === 'שנינו') {
            args.assigneeId = 'all';
          } else {
            const foundUser = users.find(u => u.name.toLowerCase() === assigneeNameLower);
            if (foundUser) {
              args.assigneeId = foundUser.id;
            }
          }
        }
        delete args.assigneeName;
        return args;
      }
    }
    console.log("Function call not found, fallback to text:", response.text);
    if (!functionCalls) return { title: response.text }; // Fallback for simple creation
    return {}; // For updates, we don't want to overwrite with just text
}


export const parseTaskFromText = async (text: string, users: User[]): Promise<any> => {
  if (!users || users.length === 0) throw new Error("User list cannot be empty.");
  
  const functionDeclaration = getCreateTaskFunctionDeclaration(users);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text }] },
      config: {
        tools: [{ functionDeclarations: [functionDeclaration] }],
        systemInstruction: `אתה עוזר וירטואלי באפליקציית משימות. התאריך היום הוא ${new Date().toLocaleDateString('he-IL')}. חלץ פרטי משימה מהטקסט וקרא לפונקציית createTask.`,
      },
    });
    return processGeminiResponse(response, users);
  } catch (error) {
    console.error('Error calling Gemini API for creation:', error);
    throw new Error('Failed to parse task from text.');
  }
};

export const parseTaskUpdateFromText = async (text: string, users: User[], existingTask: Task): Promise<any> => {
    if (!users || users.length === 0) throw new Error("User list cannot be empty.");
    
    const functionDeclaration = getUpdateTaskFunctionDeclaration(users);
    const systemInstruction = `
        אתה עוזר וירטואלי באפליקציית משימות. התאריך היום הוא ${new Date().toLocaleDateString('he-IL')}.
        המשתמש עורך משימה קיימת. פרטי המשימה הנוכחיים הם:
        - שם: ${existingTask.title}
        - תאריך: ${existingTask.dueDate || 'לא נקבע'}
        - מיועד ל: ${users.find(u => u.id === existingTask.assigneeId)?.name || 'כולם'}
        חלץ מהטקסט רק את השינויים שהמשתמש ביקש וקרא לפונקציית updateTask. אל תכלול שדות שהמשתמש לא ביקש לשנות.
        לדוגמה, אם המשתמש אומר "שנה את השעה לשמונה", קרא לפונקציה רק עם השדה 'dateTime' המעודכן.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text }] },
            config: {
                tools: [{ functionDeclarations: [functionDeclaration] }],
                systemInstruction,
            },
        });
        return processGeminiResponse(response, users);
    } catch (error) {
        console.error('Error calling Gemini API for update:', error);
        throw new Error('Failed to parse task update from text.');
    }
};
