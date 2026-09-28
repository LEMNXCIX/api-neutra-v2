/**
 * Email Service Test Script
 * Run with: npx tsx scripts/test-email.ts
 */

// Load environment variables from .env file
import dotenv from "dotenv";

dotenv.config();

import { PinoLoggerProvider } from "../infrastructure/providers/pino-logger.provider";
import { createEmailService } from "../infrastructure/services/email.service";

const emailService = createEmailService(new PinoLoggerProvider());

async function testEmailService() {
    console.log("🧪 Testing Email Service...\n");

    try {
        // Test 1: Welcome Email
        console.log("📧 Test 1: Sending welcome email...");
        const welcomeResult = await emailService.sendWelcomeEmail(
            "emelec_leo@outlook.com", // Replace with your email
            "Test User",
            {
                tenantName: "Neutra Test",
                supportEmail: "support@neutra.com",
                websiteUrl: "http://localhost:3000",
                primaryColor: "#007bff",
            },
        );

        if (welcomeResult) {
            console.log("✅ Welcome email sent successfully!\n");
        } else {
            console.log("❌ Welcome email failed to send\n");
        }

        // Test 2: Generic Email
        console.log("📧 Test 2: Sending generic test email...");
        const genericResult = await emailService.sendEmail(
            "emelec_leo@outlook.com", // Replace with your email
            "Test Email from Neutra",
            "welcome",
            { name: "Test User" },
            {
                tenantName: "Neutra Test",
                primaryColor: "#28a745",
            },
        );

        if (genericResult) {
            console.log("✅ Generic email sent successfully!\n");
        } else {
            console.log("❌ Generic email failed to send\n");
        }

        console.log("✨ Email service test completed!");
        console.log("📬 Check your inbox for the test emails.");
    } catch (error: any) {
        console.error("❌ Error during email test:", error.message);
        process.exit(1);
    }
}

// Run the test
testEmailService()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
