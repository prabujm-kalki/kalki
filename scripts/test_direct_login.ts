import { auth } from "../src/lib/auth";

async function main() {
  const emails = ["6379546276@kalki.internal", "8075882787@kalki.internal", "8434938031@kalki.internal"];
  
  for (const email of emails) {
    try {
      console.log(`Attempting to sign in with email: ${email}`);
      const res = await auth.api.signInEmail({
        body: {
          email: email,
          password: "password123", // Even if it's the wrong password, we just want to see if it says 'Invalid password' or 'User not found'
        }
      });
      console.log(`Success for ${email}:`, res);
    } catch (error: any) {
      console.log(`Login failed for ${email}. Error:`, error.body?.message || error.message);
    }
  }
}

main().then(() => process.exit(0));
