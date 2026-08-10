/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * KKU SSO Configuration
 * These values should be replaced with actual credentials from KKU IT
 */
const KKU_SSO_CONFIG = {
  clientId: 'YOUR_KKU_SSO_CLIENT_ID',
  authorizeUrl: 'https://sso.kku.ac.th/authorize',
  tokenUrl: 'https://sso.kku.ac.th/token',
  redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '',
  scope: 'openid profile email'
};

export const initiateKKUSSO = async () => {
  try {
    // 1. ขอ Authorize URL จาก Backend ของเรา
    const response = await fetch(import.meta.env.BASE_URL + 'api/auth/url');
    if (!response.ok) throw new Error('ไม่สามารถสร้างลิงก์เข้าสู่ระบบได้');
    
    const { url } = await response.json();
    
    // 2. เปลี่ยนหน้าไปยัง SSO (แทนการเปิด Popup) เพื่อความชัวร์ใน Iframe
    console.log("Redirecting to SSO URL:", url);
    window.location.href = url;
  } catch (error) {
    console.error("SSO Initiation Error:", error);
    throw error;
  }
};

export const handleSSOCallback = async (payload: any) => {
  // รับ Payload มาจาก Popup (อาจจะเป็น {code} หรือ {id, hash, ...})
  try {
    const response = await fetch(import.meta.env.BASE_URL + 'api/auth/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'ไม่พบข้อมูลผู้ใช้ในระบบหลัก (กรุณาเช็ครายชื่อใน MongoDB หรือ MOCK_USERS)');
    }
    
    const userData = await response.json();
    return userData; // ส่งข้อมูล (Name, Role, etc.) ไปเก็บใน Global State
  } catch (error) {
    console.error("Error processing SSO callback:", error);
    throw error;
  }
};
