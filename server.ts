import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { MongoClient, Db } from "mongodb";
import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";

dotenv.config();

const getFilename = () => {
  if (typeof __filename !== "undefined") return __filename;
  if (typeof import.meta !== "undefined" && import.meta.url) return fileURLToPath(import.meta.url);
  return process.cwd();
};
const _filename = getFilename();
const _dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(_filename);

// --- MongoDB Setup ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "journey_monitor";
let db: Db | null = null;
let isDbConnected = false;

async function connectToMongo() {
  try {
    const client = await MongoClient.connect(MONGODB_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    console.log("Connected to MongoDB successfully");
    db = client.db(DB_NAME);
    isDbConnected = true;
  } catch (err) {
    console.warn("MongoDB connection failed. Running in MOCK DATABASE mode.");
    isDbConnected = true; // Still allow app to run
  }
}

// --- PostgreSQL Setup (GSMIS) ---
const pgPool = new Pool({
  host: process.env.PG_HOST,
  port: parseInt(process.env.PG_PORT || "5432"),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  connectionTimeoutMillis: 5000,
});

let mockProgramChairs: any[] = [
  {
    program_chair_email: 'professor@kku.ac.th',
    program_chair_academic_position_id: 'ผศ.ดร.',
    program_chair_firstname: 'นนทวัฒน์',
    program_chair_lastname: 'สมพงษ์',
    program_chair_facultyid: '02',
    program_chair_facultyname: 'วิศวกรรมศาสตร์'
  }
];

async function checkIfProgramChair(email: string): Promise<boolean> {
  if (!email) return false;
  if (process.env.PG_HOST) {
    try {
      const result = await pgPool.query(
        "SELECT 1 FROM program_chair WHERE LOWER(program_chair_email) = LOWER($1) LIMIT 1",
        [email.trim()]
      );
      if (result.rows.length > 0) {
        return true;
      }
    } catch (err: any) {
      console.warn("PG: Error querying program_chair, falling back to local list:", err.message);
    }
  }
  return mockProgramChairs.some(c => c.program_chair_email.toLowerCase() === email.trim().toLowerCase());
}

async function getGSMISDetails(email: string): Promise<{
  facultyId: string | null;
  facultyName: string | null;
  academicPositionId: string | number | null;
  academicPositionName: string | null;
  academicPositionAbbr: string | null;
  officerName: string | null;
}> {
  if (!process.env.PG_HOST) {
    console.warn("PG_HOST not configured. Skipping GSMIS lookup.");
    return { facultyId: null, facultyName: null, academicPositionId: null, academicPositionName: null, academicPositionAbbr: null, officerName: null };
  }

  try {
    console.log(`PG: Scouting GSMIS details for email: ${email}`);
    // Querying SELECT * to fetch faculty, position, and name information comprehensively
    const query = "SELECT * FROM gs_persons WHERE officeremail = $1 LIMIT 1";
    const result = await pgPool.query(query, [email]);

    let row: any = null;
    if (result.rows.length > 0) {
      row = result.rows[0];
      console.log(`PG: [SUCCESS] Found primary details in gs_persons for ${email}:`, row);
    } else {
      // Fallback: Try general select if schema varies slightly
      try {
        const fallbackQuery = "SELECT * FROM gs_persons WHERE officeremail = $1 LIMIT 1";
        const fallbackResult = await pgPool.query(fallbackQuery, [email]);
        if (fallbackResult.rows.length > 0) {
          row = fallbackResult.rows[0];
          console.log(`PG: [FALLBACK SUCCESS] Found GSMIS details for ${email}:`, row);
        }
      } catch (fallbackErr: any) {
        console.error("PG: [FALLBACK ERROR] Fallback query of gs_persons failed:", fallbackErr.message);
      }
    }

    if (row) {
      const fId = row.facultyid || row.faculty_id || null;
      const fName = row.facultyname || row.faculty_name || row.fakname || row.fak_name || null;
      const acadPosId = row.academic_position_id !== undefined ? row.academic_position_id : (row.academic_position || row.academic_pos_id || null);

      const firstNameVal = row.firstname || row.first_name || row.firstname_th || row.first_name_th || null;
      const lastNameVal = row.lastname || row.last_name || row.lastname_th || row.last_name_th || row.surname || row.surname_th || null;

      let officerN = null;
      if (firstNameVal || lastNameVal) {
        officerN = `${firstNameVal ? String(firstNameVal).trim() : ""} ${lastNameVal ? String(lastNameVal).trim() : ""}`.trim();
      }
      if (!officerN) {
        officerN = row.officername || row.officername_th || row.fullname || row.name || null;
      }

      let acadName: string | null = null;
      let acadAbbr: string | null = null;

      if (acadPosId !== undefined && acadPosId !== null) {
        // Try querying the hr_academic_positions table using the academic_position_id mapped to 'id' and 'name'
        try {
          // Attempt the main query using 'id' and 'name' as specified by the user
          const posQuery = "SELECT id, name FROM hr_academic_positions WHERE id = $1 LIMIT 1";
          const posResult = await pgPool.query(posQuery, [acadPosId]);
          if (posResult.rows.length > 0) {
            const posRow = posResult.rows[0];
            acadName = posRow.name || null;
            // Best effort fallback in case any other columns like abbr exist, but 'name' is the core field
            acadAbbr = (posRow as any).abbr || (posRow as any).academic_position_abbr || null;
            console.log(`PG: Found academic position relation (id, name) successfully:`, { acadName, acadAbbr });
          } else {
            // General select fallback if no rows matched standard ID
            try {
              const posQueryFallback = "SELECT * FROM hr_academic_positions WHERE id = $1 LIMIT 1";
              const posResultFallback = await pgPool.query(posQueryFallback, [acadPosId]);
              if (posResultFallback.rows.length > 0) {
                const posRow = posResultFallback.rows[0];
                acadName = posRow.name || posRow.academic_position_name || posRow.name_th || null;
                acadAbbr = posRow.abbr || posRow.academic_position_abbr || posRow.abbr_th || null;
                console.log(`PG: Found academic position using 'id' fallback successfully:`, { acadName, acadAbbr });
              }
            } catch (pkErr: any) {
              console.warn("PG: Fallback PK id query failed:", pkErr.message);
            }
          }
        } catch (posErr: any) {
          console.error("PG: Error querying hr_academic_positions. Trying schema sensing...", posErr.message);

          // Schema sensing fallback
          try {
            const schemaQuery = "SELECT * FROM hr_academic_positions LIMIT 1";
            const schemaRes = await pgPool.query(schemaQuery);
            if (schemaRes.rows.length > 0) {
              const sampleRow = schemaRes.rows[0];
              const keys = Object.keys(sampleRow);
              console.log("PG: Detected hr_academic_positions columns:", keys);

              const idKey = keys.find(k => k.toLowerCase() === 'id' || k.toLowerCase() === 'academic_position_id' || k.toLowerCase().endsWith('id'));
              const nameKey = keys.find(k => k.toLowerCase() === 'name' || k.toLowerCase().includes('name_th') || k.toLowerCase().includes('name_academic') || k.toLowerCase().includes('pos_name') || k.toLowerCase().includes('academic_position_name'));
              const abbrKey = keys.find(k => k.toLowerCase().includes('abbr') || k.toLowerCase().includes('abbr_th') || k.toLowerCase().includes('short_name') || k.toLowerCase().includes('pos_abbr'));

              if (idKey) {
                const dynamicPosQuery = `SELECT * FROM hr_academic_positions WHERE ${idKey} = $1 LIMIT 1`;
                const dynamicPosResult = await pgPool.query(dynamicPosQuery, [acadPosId]);
                if (dynamicPosResult.rows.length > 0) {
                  const dynamicRow = dynamicPosResult.rows[0];
                  if (nameKey) acadName = dynamicRow[nameKey];
                  if (abbrKey) acadAbbr = dynamicRow[abbrKey];
                  console.log(`PG: Dynamically mapped academic position:`, { acadName, acadAbbr });
                }
              }
            }
          } catch (schemaErr: any) {
            console.error("PG: Schema sensing failed:", schemaErr.message);
          }
        }
      }

      return {
        facultyId: fId ? String(fId).trim() : null,
        facultyName: fName ? String(fName).trim() : null,
        academicPositionId: acadPosId,
        academicPositionName: acadName ? String(acadName).trim() : null,
        academicPositionAbbr: acadAbbr ? String(acadAbbr).trim() : null,
        officerName: officerN ? String(officerN).trim() : null
      };
    }

    console.log(`PG: [INFO] No record found in gs_persons for ${email}`);
    return { facultyId: null, facultyName: null, academicPositionId: null, academicPositionName: null, academicPositionAbbr: null, officerName: null };
  } catch (err: any) {
    console.error("PG: [ERROR] Error in getGSMISDetails:", err.message);
    return { facultyId: null, facultyName: null, academicPositionId: null, academicPositionName: null, academicPositionAbbr: null, officerName: null };
  }
}

async function getStaffFacultyDetails(email: string): Promise<{
  staffEmail: string | null;
  staffName: string | null;
  staffFamilyname: string | null;
  staffFacultyId: string | null;
  staffFacultynameThai: string | null;
  staffFacultynameEng: string | null;
} | null> {
  if (!process.env.PG_HOST) {
    console.warn("PG_HOST not configured. Skipping staff_faculty lookup.");
    return null;
  }
  try {
    console.log(`PG: Scouting staff_faculty details for email: ${email}`);
    const query = "SELECT * FROM staff_faculty WHERE staff_email = $1 LIMIT 1";
    const result = await pgPool.query(query, [email]);
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`PG: [SUCCESS] Found details in staff_faculty for ${email}:`, row);
      return {
        staffEmail: row.staff_email || null,
        staffName: row.staff_name || null,
        staffFamilyname: row.staff_familyname || null,
        staffFacultyId: row.staff_facultyid !== null && row.staff_facultyid !== undefined ? String(row.staff_facultyid).trim() : null,
        staffFacultynameThai: row.staff_facultyname_thai || null,
        staffFacultynameEng: row.staff_facultyname_eng || null,
      };
    }
    console.log(`PG: [INFO] No record found in staff_faculty for ${email}`);
    return null;
  } catch (err: any) {
    console.error("PG: [ERROR] Error in getStaffFacultyDetails:", err.message);
    return null;
  }
}

async function getFacultyDetailsFromGSMIS(email: string): Promise<{ facultyId: string | null; facultyName: string | null }> {
  const details = await getGSMISDetails(email);
  if (details.facultyId) {
    return {
      facultyId: details.facultyId,
      facultyName: details.facultyName
    };
  }

  const staffDetails = await getStaffFacultyDetails(email);
  if (staffDetails) {
    return {
      facultyId: staffDetails.staffFacultyId,
      facultyName: staffDetails.staffFacultynameThai || staffDetails.staffFacultynameEng || null
    };
  }

  return {
    facultyId: null,
    facultyName: null
  };
}

async function getFacultyIdFromGSMIS(email: string): Promise<string | null> {
  const details = await getFacultyDetailsFromGSMIS(email);
  return details.facultyId;
}

// ข้อมูลจำลองสำหรับกรณีไม่ได้ต่อ DB (ชุดเดียวกับ seed.ts)
const MOCK_USERS = [
  { email: 'niran@kku.ac.th', name: 'ผศ.ดร.นิรันดร์ พิกุล', role: 'ADVISOR' },
  { email: 'staff@kku.ac.th', name: 'พัชรดนย์ บุญเสริม', role: 'STAFF' },
  { email: 'patttan@kku.ac.th', name: 'คุณ พัชรดนย์ (User)', role: 'STAFF' }
];

async function startServer() {
  await connectToMongo();
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(cors());
  app.use(express.json());

  // Dynamic sub-path rewrite middleware for reverse proxy compatibility (e.g. process.env.BASE_PATH)
  app.use((req, res, next) => {
    const rawBasePath = (process.env.BASE_PATH || process.env.VITE_BASE_PATH || '/journey_monitor').trim();
    const basePath = rawBasePath.startsWith('/') ? rawBasePath.replace(/\/+$/, '') : `/${rawBasePath.replace(/\/+$/, '')}`;

    if (basePath && basePath !== '') {
      if (req.url.startsWith(`${basePath}/`)) {
        req.url = req.url.slice(basePath.length);
      } else if (req.url === basePath) {
        req.url = '/';
      }
    }
    next();
  });

  // --- Environment Mode & Dual Credentials Support ---
  const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const isProduction = appEnv === 'production' || appEnv === 'prod';

  // --- OAuth 2.0 / SSO Configuration ---
  const SSO_CLIENT_ID = process.env.KKU_SSO_CLIENT_ID 
    || (isProduction ? process.env.KKU_SSO_CLIENT_ID_PROD : process.env.KKU_SSO_CLIENT_ID_DEV)
    || process.env.KKU_SSO_CLIENT_ID_DEV
    || '182be0c5cdcd5072bb1864cdee4d3d6e';

  const SSO_CLIENT_SECRET = process.env.KKU_SSO_CLIENT_SECRET
    || (isProduction ? process.env.KKU_SSO_CLIENT_SECRET_PROD : process.env.KKU_SSO_CLIENT_SECRET_DEV)
    || process.env.KKU_SSO_CLIENT_SECRET_DEV
    || '';

  const SSO_AUTH_URL = process.env.KKU_SSO_AUTH_URL
    || (isProduction ? process.env.KKU_SSO_AUTH_URL_PROD : process.env.KKU_SSO_AUTH_URL_DEV)
    || 'https://gsauth.kku.ac.th/auth/id/4/04b29480233f4def5c875875b6bdc3b1/182be0c5cdcd5072bb1864cdee4d3d6e';

  const SSO_TOKEN_URL = process.env.KKU_SSO_TOKEN_URL
    || (isProduction ? process.env.KKU_SSO_TOKEN_URL_PROD : process.env.KKU_SSO_TOKEN_URL_DEV)
    || 'https://gsauth.kku.ac.th/api/user';

  const SSO_USERINFO_URL = process.env.KKU_SSO_USERINFO_URL
    || (isProduction ? process.env.KKU_SSO_USERINFO_URL_PROD : process.env.KKU_SSO_USERINFO_URL_DEV)
    || 'https://gsauth.kku.ac.th/api/user';

  console.log(`[CONFIG] Active APP_ENV: ${appEnv} (isProduction: ${isProduction})`);
  console.log(`[CONFIG] KKU SSO Client ID: ${SSO_CLIENT_ID ? SSO_CLIENT_ID.substring(0, 6) + '...' : 'Not set'}`);

  // --- Life Journey API Integration ---
  const LJ_CLIENT_ID = process.env.LIFE_JOURNEY_CLIENT_ID || '6a1e2dab9eb5b9d6404d179c';
  const LJ_CLIENT_SECRET = process.env.LIFE_JOURNEY_CLIENT_SECRET || 'd75c8afe9f6ca87bc318e0230b966f2f734363ede1c3a8d7';
  const LJ_BASE_URL = process.env.LIFE_JOURNEY_API_BASE_URL || 'https://myjourney.gs.kku.ac.th';

  let ljHost = "https://myjourney.gs.kku.ac.th";
  try {
    const urlObj = new URL(LJ_BASE_URL);
    ljHost = urlObj.origin;
  } catch (e) {
    if (LJ_BASE_URL.startsWith("http")) {
      const parts = LJ_BASE_URL.split('/');
      ljHost = `${parts[0]}//${parts[2]}`;
    }
  }

  let ljCachedToken: string | null = null;
  let ljTokenExpiry = 0;

  async function getLJToken() {
    if (ljCachedToken && Date.now() < ljTokenExpiry) {
      return ljCachedToken;
    }

    // Determine credentials based on host to handle environment misconfigurations
    let activeClientId = LJ_CLIENT_ID;
    let activeClientSecret = LJ_CLIENT_SECRET;

    if (ljHost.includes("myjourney.gs.kku.ac.th")) {
      activeClientId = "6a1e2dab9eb5b9d6404d179c";
      activeClientSecret = "d75c8afe9f6ca87bc318e0230b966f2f734363ede1c3a8d7";
      console.log("LJ: Forcing PRODUCTION credentials for myjourney.gs.kku.ac.th");
    } else {
      console.log("LJ: Using configured credentials or fallbacks");
    }

    console.log("LJ: --- REQUESTING TOKEN ---");
    console.log(`LJ: Using ClientID: ${activeClientId.substring(0, 4)}...${activeClientId.substring(activeClientId.length - 4)}`);
    console.log(`LJ: Using ClientSecret length: ${activeClientSecret.length}`);

    const tokenUrl = `${ljHost}/public/api/v0/oauth/token`;

    try {
      const payload = {
        GrantType: "client_credentials",
        ClientID: activeClientId,
        ClientSecret: activeClientSecret,
      };

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (response.ok) {
        const data = JSON.parse(responseText);
        // Extract token from either root or data object
        ljCachedToken = data.accessToken || data.token || data.access_token ||
          (data.data && (data.data.accessToken || data.data.token || data.data.access_token));

        if (ljCachedToken) {
          const expiresIn = data.expiresIn || data.expires_in ||
            (data.data && (data.data.expiresIn || data.data.expires_in)) || 300;

          ljTokenExpiry = Date.now() + (expiresIn) * 1000 - 10000;
          console.log("LJ: [SUCCESS] Token obtained successfully");
          return ljCachedToken;
        }
      }

      console.error(`LJ: [FAILED] Token request failed with status ${response.status}. Response: ${responseText}`);
      throw new Error(`Token request failed: ${response.status}`);
    } catch (err: any) {
      console.error("LJ: [ERROR] Token fetch error:", err.message);
      throw err;
    }
  }

  // Helper to get base URL
  const getAppBaseUrl = (req: express.Request) => {
    // In local dev, use req headers. In AI studio, APP_URL is better if provided.
    return process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  };

  // 1. Get Authorization URL
  app.get("/api/auth/url", (req, res) => {
    // ลิงก์ตรงจาก GSAUTH ที่ IT มข. ให้มาล่าสุด
    const GSAUTH_LINK = "https://gsauth.kku.ac.th/auth/id/4/04b29480233f4def5c875875b6bdc3b1/182be0c5cdcd5072bb1864cdee4d3d6e";

    console.log("SERVER: Auth URL Request from:", req.get('origin') || 'no-origin');
    console.log("SERVER: APP_URL is:", process.env.APP_URL || 'not-set');
    console.log("SERVER: Target SSO URL:", GSAUTH_LINK);

    return res.json({ url: GSAUTH_LINK });
  });

  // --- API Routes ---

  // 3. Get User Profile from Auth Data (Token or GSAUTH Hash)
  app.post("/api/auth/profile", async (req, res) => {
    const { p1, p2, p3, p4 } = req.body;

    // p4 คือค่าอีเมลที่เข้ารหัสมา
    const encryptedEmail = p4 || req.body.token;
    const systemId = "182be0c5cdcd5072bb1864cdee4d3d6e"; // จากรูปของคุณ

    console.log("SERVER: --- STARTING MULTI-STAGE AUTH FLOW ---");
    console.log("SERVER: Params Received:", { p1, p2, p3, p4 });

    try {
      if (!encryptedEmail) {
        return res.status(400).json({ error: "Missing encrypted email parameter (p4)" });
      }

      // --- STAGE 1: GET DECRYPTED EMAIL ---
      console.log("SERVER: [STAGE 1] Fetching decrypted email from /login/email...");
      const stage1Url = `https://gsauth.kku.ac.th/login/email?email=${encryptedEmail}`;
      const stage1Res = await fetch(stage1Url, {
        method: 'POST',
        headers: { "Cookie": `ci_gsauth=${p3 || ''}` }
      });

      if (!stage1Res.ok) throw new Error(`Stage 1 Failed: ${stage1Res.status}`);
      const stage1Data = await stage1Res.json();

      console.log("\x1b[32m%s\x1b[0m", "🟢 STAGE 1 DATA (Decrypted Email):");
      console.log(JSON.stringify(stage1Data, null, 2));

      const userEmail = stage1Data.email;
      if (!userEmail) throw new Error("Could not decrypt email from Stage 1");

      // --- STAGE 2: LOGIN TO GET TOKEN ---
      console.log("SERVER: [STAGE 2] Logging in to get JWT Token...");
      const stage2Url = `https://gsauth.kku.ac.th/login/api?email=${userEmail}&system=${systemId}`;
      const stage2Res = await fetch(stage2Url, {
        method: 'POST',
        headers: { "Cookie": `ci_gsauth=${p3 || ''}` }
      });

      if (!stage2Res.ok) throw new Error(`Stage 2 Failed: ${stage2Res.status}`);
      const stage2Data = await stage2Res.json();

      console.log("\x1b[32m%s\x1b[0m", "🟢 STAGE 2 DATA (Login Result):");
      console.log(JSON.stringify(stage2Data, null, 2));

      const jwtToken = stage2Data.token;
      if (!jwtToken) throw new Error("Did not receive JWT token from Stage 2");

      // --- STAGE 3: GET FULL USER PROFILE ---
      console.log("SERVER: [STAGE 3] Fetching full profile using JWT Token...");
      // จากรูป Postman url มี ?= ต่อท้ายเสมอ
      const stage3Url = `https://gsauth.kku.ac.th/api/user?=${jwtToken}`;
      const stage3Res = await fetch(stage3Url, {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${jwtToken}`,
          "Cookie": `ci_gsauth=${jwtToken}`
        }
      });

      if (!stage3Res.ok) throw new Error(`Stage 3 Failed: ${stage3Res.status}`);
      const fullProfile = await stage3Res.json();

      console.log("\x1b[32m%s\x1b[0m", "🟢 STAGE 3 DATA (Full Profile):");
      console.log(JSON.stringify(fullProfile, null, 2));
      console.log("SERVER: --- AUTH FLOW COMPLETED SUCCESSFULLY ---");

      // 1. ฟังก์ชันลบคำนำหน้า (ทั้งยศวิชาการย่อย ยศทั่วไป และคำนำหน้าต่าง ๆ ของอาจารย์) เพื่อให้เหลือแต่ชื่อ-นามสกุลจริง
      const cleanNamePrefix = (nameStr: string): string => {
        if (!nameStr) return "";
        let cleaned = nameStr.trim();

        const prefixes = [
          "ศ.(เทียบเท่า ป.เอก)",
          "รศ.(เทียบเท่า ป.เอก)",
          "ผศ.(เทียบเท่า ป.เอก)",
          "อ.(เทียบเท่า ป.เอก)",
          "ศ.ดร.",
          "รศ.ดร.",
          "ผศ.ดร.",
          "อ.ดร.",
          "ศ.",
          "รศ.",
          "ผศ.",
          "อ.",
          "นาย",
          "นางสาว",
          "นาง",
          "น.ส.",
          "นส.",
          "คุณ",
          "ดร."
        ];

        for (const prefix of prefixes) {
          if (cleaned.startsWith(prefix)) {
            cleaned = cleaned.substring(prefix.length).trim();
            return cleanNamePrefix(cleaned);
          }
        }
        return cleaned;
      };

      const formatWithFacultySpace = (raw: string | null | undefined): string => {
        if (!raw) return "";
        const cleaned = raw.replace(/^คณะ\s*/, '').trim();
        return cleaned ? `คณะ ${cleaned}` : "";
      };

      // 2. ฟังก์ชันตรวจหายศหรือตำแหน่งวิชาการจากชื่อเต็มดั้งเดิม หรือจากฟิลด์ prefix ของ SSO
      const detectAcademicPrefix = (fullNameStr: string, prefixStr: string): string => {
        const normalizedPrefix = prefixStr ? prefixStr.trim() : "";

        const academicPrefixes = [
          "ศ.(เทียบเท่า ป.เอก)",
          "รศ.(เทียบเท่า ป.เอก)",
          "ผศ.(เทียบเท่า ป.เอก)",
          "อ.(เทียบเท่า ป.เอก)",
          "ศ.ดร.",
          "รศ.ดร.",
          "ผศ.ดร.",
          "อ.ดร.",
          "ศ.",
          "รศ.",
          "ผศ.",
          "อ."
        ];

        // 2.1 ถ้ามี prefix จาก SSO และเป็นหนึ่งในยศอาจารย์ ให้ใช้ตัวนั้นเลย
        if (normalizedPrefix && academicPrefixes.includes(normalizedPrefix)) {
          return normalizedPrefix;
        }

        // 2.2 ถ้าใน prefix ไม่มี แต่มีติดอยู่ในชื่อเต็มของอาจารย์ ให้คัดแยกออกมา
        const trimmedFull = fullNameStr.trim();
        for (const acPrefix of academicPrefixes) {
          if (trimmedFull.startsWith(acPrefix)) {
            return acPrefix;
          }
        }

        return "";
      };

      // Extract Faculty & Department dynamically from GSMIS database / GSAuth profile
      // Fetch details from GSMIS database (both faculty mapping and academic position)
      const gsmisDetails = await getGSMISDetails(userEmail);
      console.log(`AUTH: Scouted GSMIS details:`, gsmisDetails, `for email: ${userEmail}`);

      let finalUser: any = null;

      if (gsmisDetails.officerName) {
        // --- ACADEMIC / LECTURER / ADVISOR FLOW (Found in gs_persons) ---
        const dbOfficerName = gsmisDetails.officerName.trim();
        const rawFullName = dbOfficerName;
        const rawPrefix = (fullProfile.prefix || fullProfile.title || "").trim();

        // แมปข้อมูลตามคำนำหน้าและผลลัพธ์จาก SSO
        const fullName = cleanNamePrefix(rawFullName);
        const academicPrefix = detectAcademicPrefix(rawFullName, rawPrefix);

        // กำหนดตำแหน่งทางวิชาการ (Academic Prefix) เพิ่มเติมหากมีข้อมูลในระบบฐานข้อมูล GSMIS
        let resolvedAcademicPrefix = academicPrefix; // จากชื่อหรือ prefix SSO ก่อนหน้า
        let hasAcademicPositionInDb = false;

        if (gsmisDetails.academicPositionId !== null && gsmisDetails.academicPositionId !== undefined && gsmisDetails.academicPositionId !== "") {
          hasAcademicPositionInDb = true;

          let dbPrefix = "";
          if (gsmisDetails.academicPositionAbbr) {
            dbPrefix = gsmisDetails.academicPositionAbbr.trim();
          } else if (gsmisDetails.academicPositionName) {
            const nameClean = gsmisDetails.academicPositionName.trim();
            const commonAbbrs = ["ผศ.ดร.", "รศ.ดร.", "ศ.ดร.", "อ.ดร.", "ผศ.", "รศ.", "ศ.", "อ."];
            const matchedAbbr = commonAbbrs.find(abbr => nameClean.startsWith(abbr) || nameClean === abbr);

            if (matchedAbbr) {
              dbPrefix = matchedAbbr;
            } else {
              const nameLower = nameClean.toLowerCase();
              if (nameLower.includes("ศาสตราจารย์") && nameLower.includes("รอง")) {
                dbPrefix = "รศ.";
              } else if (nameLower.includes("ศาสตราจารย์") && nameLower.includes("ผู้ช่วย")) {
                dbPrefix = "ผศ.";
              } else if (nameLower.includes("ศาสตราจารย์")) {
                dbPrefix = "ศ.";
              } else if (nameLower.includes("อาจารย์")) {
                dbPrefix = "อ.";
              } else if (nameLower.includes("professor") && nameLower.includes("associate")) {
                dbPrefix = "รศ.";
              } else if (nameLower.includes("professor") && nameLower.includes("assistant")) {
                dbPrefix = "ผศ.";
              } else if (nameLower.includes("professor")) {
                dbPrefix = "ศ.";
              } else if (nameLower.includes("lecturer")) {
                dbPrefix = "อ.";
              }
            }
          }

          const profileHasDoctor =
            (rawFullName && (rawFullName.includes("ดร.") || rawFullName.toLowerCase().includes("dr.") || rawFullName.toLowerCase().includes("ph.d"))) ||
            (rawPrefix && (rawPrefix.includes("ดร.") || rawPrefix.toLowerCase().includes("dr."))) ||
            (gsmisDetails.academicPositionName && (gsmisDetails.academicPositionName.includes("ดร.") || gsmisDetails.academicPositionName.toLowerCase().includes("dr."))) ||
            (gsmisDetails.academicPositionAbbr && (gsmisDetails.academicPositionAbbr.includes("ดร.") || gsmisDetails.academicPositionAbbr.toLowerCase().includes("dr."))) ||
            (fullProfile && (JSON.stringify(fullProfile).includes("ดร.") || JSON.stringify(fullProfile).toLowerCase().includes("dr.")));

          if (profileHasDoctor && dbPrefix && !dbPrefix.includes("ดร.")) {
            dbPrefix = dbPrefix + "ดร.";
          }

          if (dbPrefix) {
            resolvedAcademicPrefix = dbPrefix;
          } else if (!resolvedAcademicPrefix) {
            resolvedAcademicPrefix = "อ.";
          }
        }

        let resolvedFaculty = '';

        // Prioritize the facultyName directly from the database if present
        if (gsmisDetails.facultyName) {
          resolvedFaculty = gsmisDetails.facultyName.trim();
        } else if (gsmisDetails.facultyId) {
          const idStr = String(gsmisDetails.facultyId).trim();
          if (idStr === '24' || idStr === '21' || idStr.toLowerCase().includes('grad') || idStr.toLowerCase().includes('gs')) {
            resolvedFaculty = 'บัณฑิตวิทยาลัย';
          } else if (idStr === '02' || idStr === '2' || idStr.toLowerCase().includes('eng')) {
            resolvedFaculty = 'วิศวกรรมศาสตร์';
          } else if (idStr === '03' || idStr === '3' || idStr.toLowerCase().includes('sci')) {
            resolvedFaculty = 'วิทยาศาสตร์';
          } else if (idStr === '01' || idStr === '1' || idStr.toLowerCase().includes('agr')) {
            resolvedFaculty = 'เกษตรศาสตร์';
          } else if (idStr === '04' || idStr === '4' || idStr.toLowerCase().includes('tech')) {
            resolvedFaculty = 'เทคโนโลยี';
          } else if (idStr === '05' || idStr === '5' || idStr.toLowerCase().includes('hum')) {
            resolvedFaculty = 'มนุษยศาสตร์และสังคมศาสตร์';
          } else if (idStr === '06' || idStr === '6' || idStr.toLowerCase().includes('edu')) {
            resolvedFaculty = 'ศึกษาศาสตร์';
          } else if (idStr === '07' || idStr === '7' || idStr.toLowerCase().includes('nur')) {
            resolvedFaculty = 'พยาบาลศาสตร์';
          } else if (idStr === '08' || idStr === '8' || idStr.toLowerCase().includes('med')) {
            resolvedFaculty = 'แพทยศาสตร์';
          } else if (idStr === '10' || idStr.toLowerCase().includes('pub')) {
            resolvedFaculty = 'สาธารณสุขศาสตร์';
          } else if (idStr === '11' || idStr.toLowerCase().includes('den')) {
            resolvedFaculty = 'ทันตแพทยศาสตร์';
          } else if (idStr === '12' || idStr.toLowerCase().includes('pha')) {
            resolvedFaculty = 'เภสัชศาสตร์';
          } else if (idStr === '13' || idStr.toLowerCase().includes('vet')) {
            resolvedFaculty = 'สัตวแพทยศาสตร์';
          } else if (idStr === '14' || idStr.toLowerCase().includes('acc')) {
            resolvedFaculty = 'บริหารธุรกิจและการบัญชี';
          } else if (idStr === '15' || idStr.toLowerCase().includes('art')) {
            resolvedFaculty = 'ศิลปกรรมศาสตร์';
          } else if (idStr === '16' || idStr.toLowerCase().includes('arc')) {
            resolvedFaculty = 'สถาปัตยกรรมศาสตร์';
          } else {
            resolvedFaculty = idStr;
          }
        }

        if (!resolvedFaculty) {
          resolvedFaculty = (
            fullProfile.faculty_name ||
            fullProfile.facultyName ||
            fullProfile.faculty ||
            fullProfile.fakName ||
            fullProfile.fak_name ||
            'วิศวกรรมศาสตร์'
          ).trim();
        }

        if (resolvedFaculty.startsWith("คณะ")) {
          resolvedFaculty = resolvedFaculty.replace(/^คณะ\s*/, '').trim();
        }

        let resolvedDepartment = (
          fullProfile.department_name ||
          fullProfile.departmentName ||
          fullProfile.department ||
          fullProfile.dept_name ||
          fullProfile.deptName ||
          fullProfile.office ||
          'คอมพิวเตอร์'
        ).trim();

        if (resolvedDepartment.startsWith("ภาควิชา")) {
          resolvedDepartment = resolvedDepartment.replace(/^ภาควิชา\s*/, '').trim();
        }

        const isProgChair = await checkIfProgramChair(userEmail);
        const rawFacultyFromSsoOrGsmis = fullProfile.facultyname || fullProfile.faculty_name || fullProfile.facultyName || fullProfile.fakName || fullProfile.fak_name || gsmisDetails.facultyName;
        const resolvedFacultyName = formatWithFacultySpace(rawFacultyFromSsoOrGsmis || resolvedFaculty);
        finalUser = {
          email: fullProfile.email || userEmail,
          name: fullName,
          prefix: resolvedAcademicPrefix || "อ.",
          faculty: resolvedFaculty,
          facultyname: resolvedFacultyName,
          facultyId: gsmisDetails.facultyId || null,
          department: resolvedDepartment,
          academicPositionName: gsmisDetails.academicPositionName || null,
          role: 'ADVISOR',
          secondaryRoles: isProgChair ? ['PROGRAM_CHAIR'] : [],
          sso_data: fullProfile
        };

        console.log(`AUTH: User [${userEmail}] verified in gs_persons as academic. Mapped to ADVISOR with secondary PROGRAM_CHAIR: ${isProgChair}`);

      } else {
        // --- STAFF / NOT FOUND IN GS_PERSONS ---
        const staffDetails = await getStaffFacultyDetails(userEmail);

        if (staffDetails) {
          const fullName = `${staffDetails.staffName || ""} ${staffDetails.staffFamilyname || ""}`.trim();
          let resolvedFaculty = staffDetails.staffFacultynameThai || staffDetails.staffFacultynameEng || "";
          if (resolvedFaculty.startsWith("คณะ")) {
            resolvedFaculty = resolvedFaculty.replace(/^คณะ\s*/, '').trim();
          }

          const rawFacultyFromStaff = staffDetails.staffFacultynameThai || staffDetails.staffFacultynameEng || "";
          const resolvedFacultyName = formatWithFacultySpace(rawFacultyFromStaff || resolvedFaculty);

          finalUser = {
            email: userEmail,
            name: fullName,
            prefix: "",
            faculty: resolvedFaculty || "วิศวกรรมศาสตร์",
            facultyname: resolvedFacultyName,
            facultyId: staffDetails.staffFacultyId || null,
            department: "",
            academicPositionName: null,
            role: 'STAFF',
            secondaryRoles: [],
            sso_data: fullProfile
          };

          console.log(`AUTH: User [${userEmail}] verified in staff_faculty as staff. Mapped to STAFF role only.`);
        } else {
          // Fallback
          const rawFullName = (fullProfile.fullname || fullProfile.name || userEmail.split('@')[0]).trim();
          const fullName = cleanNamePrefix(rawFullName);
          const rawPrefix = (fullProfile.prefix || fullProfile.title || "").trim();

          const hasStaffPrefix = (text: string): boolean => {
            if (!text) return false;
            const normalized = text.trim().toLowerCase();
            const generalThaiPrefixes = ["นาย", "นาง", "นางสาว", "น.ส.", "นส.", "คุณ"];
            const startsWithThai = generalThaiPrefixes.some(p => normalized.startsWith(p));
            const generalEnglishPrefixes = ["mr.", "mr ", "mrs.", "mrs ", "ms.", "ms ", "miss "];
            const startsWithEnglish = generalEnglishPrefixes.some(p => normalized.startsWith(p));
            return startsWithThai || startsWithEnglish;
          };

          const isStaffByPrefix = hasStaffPrefix(rawFullName) || hasStaffPrefix(rawPrefix);
          const isStaffByUsertype = fullProfile.usertype === 'STAFF' || fullProfile.type === 'STAFF';
          const isStaff = isStaffByPrefix || isStaffByUsertype;

          let resolvedFaculty = (
            fullProfile.faculty_name ||
            fullProfile.facultyName ||
            fullProfile.faculty ||
            fullProfile.fakName ||
            fullProfile.fak_name ||
            (userEmail === 'patttan@kku.ac.th' ? 'บัณฑิตวิทยาลัย' : 'วิศวกรรมศาสตร์')
          ).trim();

          if (resolvedFaculty.startsWith("คณะ")) {
            resolvedFaculty = resolvedFaculty.replace(/^คณะ\s*/, '').trim();
          }

          const rawFacultyFromFallback = fullProfile.facultyname || fullProfile.faculty_name || fullProfile.facultyName || fullProfile.fakName || fullProfile.fak_name;
          const resolvedFacultyName = formatWithFacultySpace(rawFacultyFromFallback || resolvedFaculty);

          const isProgChair = await checkIfProgramChair(userEmail);
          finalUser = {
            email: fullProfile.email || userEmail,
            name: fullName,
            prefix: isStaff ? "" : "อ.",
            faculty: resolvedFaculty,
            facultyname: resolvedFacultyName,
            facultyId: await getFacultyIdFromGSMIS(userEmail) || null,
            department: isStaff ? "" : "คอมพิวเตอร์",
            academicPositionName: null,
            role: isStaff ? 'STAFF' : 'ADVISOR',
            secondaryRoles: isStaff ? [] : (isProgChair ? ['PROGRAM_CHAIR'] : []),
            sso_data: fullProfile
          };

          console.log(`AUTH: User [${userEmail}] fallback processed (isStaff: ${isStaff}, isProgChair: ${isProgChair}).`);
        }
      }

      return res.json(finalUser);

    } catch (error: any) {
      console.error("\x1b[31m%s\x1b[0m", "🔴 AUTH FLOW ERROR:", error.message);
      res.status(500).json({ error: "การยืนยันตัวตนผิดพลาด: " + error.message });
    }
  });

  // 1. Database: สำหรับ mapping ข้อมูลผู้ใช้จาก SSO
  app.get("/api/user/profile", async (req, res) => {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      if (!isDbConnected || !db) {
        console.log(`Searching for ${email} in MOCK_USERS...`);
        const user = MOCK_USERS.find(u => u.email === email);
        if (user) {
          return res.json(user);
        } else {
          return res.status(404).json({
            error: "ไม่พบข้อมูลผู้ใช้ในระบบจำลอง",
            suggestion: "กรุณาใช้อีเมลที่อยู่ในรายการ Seed หรือเพิ่มข้อมูลใน MongoDB"
          });
        }
      }

      // ค้นหาข้อมูลผู้ใช้จาก collection "users"
      const user = await db.collection("users").findOne({ email: email });

      if (user) {
        res.json(user);
      } else {
        // ถ้าไม่พบ ให้ส่ง Error หรือจะจำลอง Default Role มาก่อนก็ได้
        // สำหรับช่วงพัฒนา ถ้าไม่เจอ เราจะลองส่ง Staff กลับไปเพื่อให้ระบบไม่พัง
        res.status(404).json({
          error: "User not found in system database",
          suggestion: "Please add this user to 'users' collection in MongoDB"
        });
      }
    } catch (error) {
      console.error("Database query error:", error);
      res.status(500).json({ error: "Internal server error connecting to database" });
    }
  });

  // Cache for Life Journey student lists (TTL 10 minutes)
  const ljStudentsCache = new Map<string, { data: any; timestamp: number }>();
  const LJ_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  // 2. Real Life Journey API: ดึงผลสถานะจากระบบจริง
  app.get("/api/life-journey/students", async (req, res) => {
    try {
      const { email, role, refresh } = req.query;
      const userEmail = String(email);
      const userRole = role ? String(role) : 'ADVISOR';

      // 1. Fetch facultyId from GSMIS Postgres
      let facultyId = await getFacultyIdFromGSMIS(userEmail);

      // Fallback: หากไม่พบ facultyId ใน Database แต่มีการส่ง faculty มาจาก Frontend ให้แปรเป็น ID กลับ
      if (!facultyId && req.query.faculty) {
        const queryFaculty = String(req.query.faculty).trim();
        if (queryFaculty.includes('วิศวกรรมศาสตร์')) facultyId = '02';
        else if (queryFaculty.includes('วิทยาศาสตร์')) facultyId = '03';
        else if (queryFaculty.includes('เกษตรศาสตร์')) facultyId = '01';
        else if (queryFaculty.includes('เทคโนโลยี')) facultyId = '04';
        else if (queryFaculty.includes('มนุษยศาสตร์')) facultyId = '05';
        else if (queryFaculty.includes('ศึกษาศาสตร์')) facultyId = '06';
        else if (queryFaculty.includes('บัณฑิตวิทยาลัย')) facultyId = '24';
        console.log(`LJ: Resolved facultyId "${facultyId}" from fallback query faculty "${queryFaculty}"`);
      }

      // Check In-Memory Cache first (unless refresh=true is requested)
      const cacheKey = `lj_students_${userRole}_${facultyId || 'all'}_${userEmail}`;
      if (refresh !== 'true') {
        const cached = ljStudentsCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < LJ_CACHE_TTL_MS)) {
          const ageSec = Math.round((Date.now() - cached.timestamp) / 1000);
          console.log(`LJ: [CACHE HIT] Returning cached data for key "${cacheKey}" (Age: ${ageSec}s)`);
          return res.json(cached.data);
        }
      }

      // 2. Get Journey Token
      const token = await getLJToken();

      const host = ljHost;
      const studentPath = "/public/api/v0/students";

      // 3. Prepare Base Query Params
      const baseParams: any = {
        limit: 100
      };

      // Restrict to advisor email ONLY when requested as ADVISOR role
      if (userRole === 'ADVISOR') {
        baseParams.advisorEmail = userEmail;
        console.log(`LJ: Querying with advisorEmail filter for ADVISOR role: ${userEmail}`);
      } else {
        console.log(`LJ: Querying administrative or program chair view (Role: ${userRole}). Fetching all faculty students.`);
      }

      // Add facultyId if found in GSMIS (mapped to Life Journey API expected faculty IDs)
      if (facultyId) {
        const cleanId = String(facultyId).trim();
        let ljFacultyId = cleanId;

        // Map GSMIS ID (e.g. "02", "03") to Life Journey API expected faculty IDs
        if (cleanId === '24' || cleanId === '10' || cleanId === '010') {
          ljFacultyId = '10'; // บัณฑิตวิทยาลัย
        } else if (cleanId === '02' || cleanId === '2' || cleanId === '04' || cleanId === '4') {
          ljFacultyId = '4';  // คณะวิศวกรรมศาสตร์
        } else if (cleanId === '03' || cleanId === '3') {
          ljFacultyId = '2';  // คณะวิทยาศาสตร์
        } else if (cleanId === '01' || cleanId === '1') {
          ljFacultyId = '3';  // คณะเกษตรศาสตร์
        } else if (cleanId === '06' || cleanId === '6' || cleanId === '05' || cleanId === '5') {
          ljFacultyId = '5';  // คณะศึกษาศาสตร์ / คณะมนุษยศาสตร์
        } else if (cleanId === '11') {
          ljFacultyId = '11'; // คณะสาธารณสุขศาสตร์
        } else if (cleanId === '13') {
          ljFacultyId = '13'; // คณะทันตแพทยศาสตร์
        } else if (cleanId === '28') {
          ljFacultyId = '28'; // วิทยาลัยการปกครองท้องถิ่น
        }

        baseParams.facultyId = ljFacultyId;
        console.log(`LJ: Using mapped facultyId filter for Life Journey API: "${ljFacultyId}" (GSMIS original: "${facultyId}")`);
      }

      // --- PARALLEL BATCH FETCHING FOR MAXIMUM SPEED & 100% COMPLETENESS ---
      const startTime = Date.now();

      // Step A: Fetch Page 1 to inspect structure and totalPages
      const page1Params = new URLSearchParams({ ...baseParams, page: "1" }).toString();
      const page1Url = `${host}${studentPath}?${page1Params}`;
      console.log(`LJ: [FAST FETCH] Fetching Page 1 from ${page1Url}...`);

      const page1Res = await fetch(page1Url, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!page1Res.ok) {
        const text = await page1Res.text();
        console.error(`LJ: [FAILED] Student fetch status ${page1Res.status} at page 1: ${text}`);
        throw new Error(`LJ API error (${page1Res.status}): ${text}`);
      }

      const page1Text = await page1Res.text();
      const page1Data = JSON.parse(page1Text);
      const originalRawData = page1Data;

      let totalPages = 1;
      let page1Items: any[] = [];

      if (page1Data.data && Array.isArray(page1Data.data.items)) {
        page1Items = page1Data.data.items;
        totalPages = page1Data.pagination?.totalPage || 1;
      } else if (page1Data.data && Array.isArray(page1Data.data)) {
        page1Items = page1Data.data;
      } else if (page1Data.items && Array.isArray(page1Data.items)) {
        page1Items = page1Data.items;
      } else if (Array.isArray(page1Data)) {
        page1Items = page1Data;
      }

      console.log(`LJ: Page 1 fetched ${page1Items.length} items. Total pages detected: ${totalPages}`);

      const pagesDataMap = new Map<number, any[]>();
      pagesDataMap.set(1, page1Items);

      // Step B: Fetch remaining pages (2..totalPages) in parallel batches
      if (totalPages > 1) {
        const remainingPages: number[] = [];
        for (let p = 2; p <= totalPages; p++) remainingPages.push(p);

        const BATCH_SIZE = 6; // 6 requests in parallel per batch
        for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
          const batch = remainingPages.slice(i, i + BATCH_SIZE);
          console.log(`LJ: Parallel fetching pages [${batch.join(', ')}] of ${totalPages}...`);

          const batchPromises = batch.map(async (pNum) => {
            try {
              const qp = new URLSearchParams({ ...baseParams, page: pNum.toString() }).toString();
              const url = `${host}${studentPath}?${qp}`;
              const res = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
              if (res.ok) {
                const txt = await res.text();
                const pData = JSON.parse(txt);
                let items: any[] = [];
                if (pData.data && Array.isArray(pData.data.items)) {
                  items = pData.data.items;
                } else if (pData.data && Array.isArray(pData.data)) {
                  items = pData.data;
                } else if (pData.items && Array.isArray(pData.items)) {
                  items = pData.items;
                } else if (Array.isArray(pData)) {
                  items = pData;
                }
                return { pageNum: pNum, items };
              } else {
                console.error(`LJ: Failed page ${pNum} with status ${res.status}`);
                return { pageNum: pNum, items: [] };
              }
            } catch (err) {
              console.error(`LJ: Error fetching page ${pNum}:`, err);
              return { pageNum: pNum, items: [] };
            }
          });

          const results = await Promise.all(batchPromises);
          results.forEach(({ pageNum, items }) => {
            pagesDataMap.set(pageNum, items);
          });
        }
      }

      // Reassemble all items in strict page order 1..totalPages
      let allStudents: any[] = [];
      for (let p = 1; p <= totalPages; p++) {
        const items = pagesDataMap.get(p) || [];
        allStudents = allStudents.concat(items);
      }

      const durationMs = Date.now() - startTime;
      console.log(`LJ: [FAST FETCH COMPLETE] Total collected: ${allStudents.length} items across ${totalPages} pages in ${durationMs}ms`);

      // --- FILTER STUDENTS BY STATUS ID (10: นักศึกษาปัจจุบัน สถานะปกติ, 11: รักษาสภาพนักศึกษา) ---
      const totalCollected = allStudents.length;

      // DEBUG: Log status distribution
      const statusCounts: Record<string, number> = {};
      allStudents.forEach(s => {
        const sid = String(s.profile?.studentStatus?.id || s.studentStatus?.id || 'unknown');
        statusCounts[sid] = (statusCounts[sid] || 0) + 1;
      });
      console.log("LJ: [DEBUG] Status distribution across all pages:", statusCounts);

      // เฉพาะสิทธิ์อาจารย์ที่ปรึกษา (ADVISOR): ดึงสถานะ 10 (ปกติ) และ 11 (รักษาสภาพ)
      // สิทธิ์อื่นๆ: ดึงเฉพาะสถานะ 10
      const allowedStatusIds = userRole === 'ADVISOR' ? ['10', '11'] : ['10'];

      const filteredList = allStudents.filter(s => {
        const sid = String(s.profile?.studentStatus?.id || s.studentStatus?.id || '');
        return allowedStatusIds.includes(sid);
      });
      console.log(`LJ: [FILTERED BY STATUS ${allowedStatusIds.join(',')}] Role: ${userRole}, Found ${filteredList.length} students (filtered out ${totalCollected - filteredList.length} students)`);

      let responsePayload: any;

      // Re-attach filtered list to the original response structure
      if (originalRawData) {
        responsePayload = { ...originalRawData };
        if (responsePayload.data && responsePayload.data.items) {
          responsePayload.data = { ...responsePayload.data, items: filteredList };
        } else if (responsePayload.data) {
          responsePayload.data = filteredList;
        } else if (responsePayload.items) {
          responsePayload.items = filteredList;
        } else {
          responsePayload.data = { items: filteredList };
        }

        // Update pagination numbers to match the filtered list
        if (responsePayload.pagination) {
          responsePayload.pagination = {
            ...responsePayload.pagination,
            totalItem: filteredList.length,
            totalPage: 1,
            currentPage: 1,
            limit: filteredList.length || 100
          };
        }
      } else {
        responsePayload = { isSuccess: true, data: { items: filteredList } };
      }

      // Save to In-Memory Cache for fast future responses
      ljStudentsCache.set(cacheKey, {
        data: responsePayload,
        timestamp: Date.now()
      });
      console.log(`LJ: [CACHE SAVED] Saved payload for key "${cacheKey}" to memory (TTL: 10 mins)`);

      return res.json(responsePayload);
    } catch (error: any) {
      console.error("LJ Students Error:", error);
      res.status(500).json({
        error: error.message,
        details: "API Configuration is now fixed. If error persists, please check API credentials.",
        tip: "ตรวจสอบให้แน่ใจว่าได้คัดลอกไฟล์ server.ts ล่าสุดจาก AI Studio ไปรันที่เครื่องแล้ว"
      });
    }
  });

  // 3. Journey Access Link: ขอลิงก์เข้าดูข้อมูลเชิงลึก
  app.get("/api/life-journey/access/:studentCode", async (req, res) => {
    const { studentCode } = req.params;
    try {
      const token = await getLJToken();
      console.log(`LJ: Requesting access key for ${studentCode}`);

      const host = ljHost;
      const apiUrl = `${host}/public/api/v0/students/${studentCode}/journey-access`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`LJ Access Failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("LJ: Journey access response:", JSON.stringify(data));

      // Map properties consistently to feed into the frontend format seamlessly
      const readOnlyUrl = data.data?.readOnlyUrl || data.readOnlyUrl || (data.data && data.data.url) || data.url;
      const expiresIn = data.data?.expiresIn || data.expiresIn || 3600;

      res.json({
        isSuccess: true,
        url: readOnlyUrl,
        accessUrl: readOnlyUrl,
        readOnlyUrl: readOnlyUrl,
        expiresIn: expiresIn,
        data: {
          readOnlyUrl: readOnlyUrl,
          url: readOnlyUrl,
          expiresIn: expiresIn
        }
      });
    } catch (error: any) {
      console.error("LJ Access Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Program Chair Management Endpoints ---

  const mockPersons = [
    {
      officeremail: 'professor@kku.ac.th',
      firstname: 'นนทวัฒน์',
      lastname: 'สมพงษ์',
      facultyid: '02',
      facultyname: 'วิศวกรรมศาสตร์',
      academic_position_id: 'ผศ.ดร.',
      academic_position_name: 'ผู้ช่วยศาสตราจารย์ ดร.'
    },
    {
      officeremail: 'niran@kku.ac.th',
      firstname: 'นิรันดร์',
      lastname: 'วงศ์พงษ์คำ',
      facultyid: '02',
      facultyname: 'วิศวกรรมศาสตร์',
      academic_position_id: 'รศ.ดร.',
      academic_position_name: 'รองศาสตราจารย์ ดร.'
    },
    {
      officeremail: 'wichai@kku.ac.th',
      firstname: 'วิชัย',
      lastname: 'วงศ์กันนันท์วัฒนา',
      facultyid: '02',
      facultyname: 'วิศวกรรมศาสตร์',
      academic_position_id: 'ผศ.ดร.',
      academic_position_name: 'ผู้ช่วยศาสตราจารย์ ดร.'
    },
    {
      officeremail: 'somkiat@kku.ac.th',
      firstname: 'สมเกียรติ',
      lastname: 'ตั้งกิจวานิชกุล',
      facultyid: '02',
      facultyname: 'วิศวกรรมศาสตร์',
      academic_position_id: 'ศ.ดร.',
      academic_position_name: 'ศาสตราจารย์ ดร.'
    },
    {
      officeremail: 'somwang@kku.ac.th',
      firstname: 'สมหวัง',
      lastname: 'มาลี',
      facultyid: '02',
      facultyname: 'วิศวกรรมศาสตร์',
      academic_position_id: 'รศ.ดร.',
      academic_position_name: 'รองศาสตราจารย์ ดร.'
    }
  ];

  // 1. Search Academic Staff from gs_persons
  app.get("/api/persons/search", async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.json([]);
    }

    if (process.env.PG_HOST) {
      try {
        let dbResult;
        try {
          dbResult = await pgPool.query(`
            SELECT 
              p.officeremail, 
              p.firstname, 
              p.lastname, 
              p.facultyid, 
              p.facultyname, 
              p.academic_position_id,
              pos.name as academic_position_name
            FROM gs_persons p
            LEFT JOIN hr_academic_positions pos ON p.academic_position_id = pos.id
            WHERE p.firstname ILIKE $1 OR p.lastname ILIKE $1 OR p.officeremail ILIKE $1
            LIMIT 50
          `, [`%${q}%`]);
        } catch (innerErr) {
          dbResult = await pgPool.query(`
            SELECT 
              officeremail, 
              firstname, 
              lastname, 
              facultyid, 
              facultyname, 
              academic_position_id
            FROM gs_persons
            WHERE firstname ILIKE $1 OR lastname ILIKE $1 OR officeremail ILIKE $1
            LIMIT 50
          `, [`%${q}%`]);
        }

        const mapped = dbResult.rows.map((row: any) => ({
          officeremail: row.officeremail || row.officer_email || row.email || "",
          firstname: row.firstname || row.first_name || row.firstname_th || row.first_name_th || "",
          lastname: row.lastname || row.last_name || row.lastname_th || row.last_name_th || row.surname || "",
          facultyid: row.facultyid || row.faculty_id || null,
          facultyname: row.facultyname || row.faculty_name || row.fakname || row.fak_name || null,
          academic_position_id: row.academic_position_id || row.academic_position || row.academic_pos_id || null,
          academic_position_name: row.academic_position_name || null
        }));

        return res.json(mapped);
      } catch (err: any) {
        console.error("PG Search Error:", err.message);
      }
    }

    // Fallback to local search
    const filtered = mockPersons.filter(p =>
      p.firstname.includes(q) ||
      p.lastname.includes(q) ||
      p.officeremail.toLowerCase().includes(q.toLowerCase())
    );
    res.json(filtered);
  });

  // 2. Fetch assigned program chairs
  app.get("/api/program-chairs", async (req, res) => {
    if (process.env.PG_HOST) {
      try {
        const result = await pgPool.query("SELECT * FROM program_chair");
        return res.json(result.rows);
      } catch (err: any) {
        console.error("PG Error fetching program-chairs:", err.message);
      }
    }
    res.json(mockProgramChairs);
  });

  // 3. Save program chair assignment
  app.post("/api/program-chairs", express.json(), async (req, res) => {
    const { email, academic_position_id, firstname, lastname, facultyid, facultyname } = req.body;
    if (!email || !firstname || !lastname) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
    }

    if (process.env.PG_HOST) {
      try {
        // Delete existing to prevent duplicate or conflict
        await pgPool.query(
          "DELETE FROM program_chair WHERE LOWER(program_chair_email) = LOWER($1)",
          [email.trim()]
        );
        // Insert new
        await pgPool.query(`
          INSERT INTO program_chair (
            program_chair_email, 
            program_chair_academic_position_id, 
            program_chair_firstname, 
            program_chair_lastname, 
            program_chair_facultyid, 
            program_chair_facultyname
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          email.trim(),
          academic_position_id || 'อ.',
          firstname,
          lastname,
          facultyid || '02',
          facultyname || 'วิศวกรรมศาสตร์'
        ]);
        console.log(`PG: Program chair assigned successfully: ${email}`);
      } catch (err: any) {
        console.error("PG Error assigning program-chair:", err.message);
        return res.status(500).json({ error: "ไม่สามารถบันทึกลงฐานข้อมูลได้: " + err.message });
      }
    }

    // Update in-memory mock state for smooth user interface updates
    mockProgramChairs = mockProgramChairs.filter(c => c.program_chair_email.toLowerCase() !== email.toLowerCase());
    mockProgramChairs.push({
      program_chair_email: email.trim(),
      program_chair_academic_position_id: academic_position_id || 'อ.',
      program_chair_firstname: firstname,
      program_chair_lastname: lastname,
      program_chair_facultyid: facultyid || '02',
      program_chair_facultyname: facultyname || 'วิศวกรรมศาสตร์'
    });

    res.json({ success: true });
  });

  // 4. Delete program chair assignment
  app.delete("/api/program-chairs/:email", async (req, res) => {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: "กรุณาระบุอีเมล" });
    }

    if (process.env.PG_HOST) {
      try {
        await pgPool.query(
          "DELETE FROM program_chair WHERE LOWER(program_chair_email) = LOWER($1)",
          [email.trim()]
        );
        console.log(`PG: Program chair removed successfully: ${email}`);
      } catch (err: any) {
        console.error("PG Error removing program-chair:", err.message);
        return res.status(500).json({ error: "ไม่สามารถลบข้อมูลจากฐานข้อมูลได้: " + err.message });
      }
    }

    mockProgramChairs = mockProgramChairs.filter(c => c.program_chair_email.toLowerCase() !== email.toLowerCase());
    res.json({ success: true });
  });

  // --- Vite Integration ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // โหมด Production สำหรับการ Deploy จริง
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
