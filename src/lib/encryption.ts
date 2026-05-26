import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// 加密算法：AES-256-GCM
// - AES-256：行业标准对称加密，256位密钥
// - GCM模式：自带数据完整性校验，防止密文被篡改
const ALGORITHM = "aes-256-gcm";

// 从环境变量读取密钥，转成 Buffer（32字节 = 256位）
function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY 环境变量未设置");
  return Buffer.from(key, "hex");
}

// ── 加密 ────────────────────────────────────────────
// 输入：明文字符串（如 Notion access token）
// 输出：格式为 "iv:authTag:encrypted" 的字符串（可安全存入 KV）
export function encrypt(plaintext: string): string {
  const key = getKey();

  // IV（初始向量）：每次加密随机生成，确保相同内容加密结果不同
  // 这是行业标准做法，防止"已知明文攻击"
  const iv = randomBytes(16);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  // authTag：GCM 模式的完整性校验码，解密时用于验证密文没有被篡改
  const authTag = cipher.getAuthTag();

  // 三段用冒号拼接，解密时再分割
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

// ── 解密 ────────────────────────────────────────────
// 输入：encrypt() 的输出字符串
// 输出：原始明文
export function decrypt(ciphertext: string): string {
  const key = getKey();

  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("密文格式不正确");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag); // 验证完整性，篡改过的密文会在这里抛错

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
