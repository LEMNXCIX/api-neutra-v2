// Rate Limit Manual Test Script
// This script tests the rate limiter by making multiple requests to the API
// Run manually with: node test/rate-limit.manual.js
// (Not a Jest test - excluded from automated test suite)

const API_URL = "http://localhost:4001/api";

async function testRateLimit() {
    console.log("🔍 Testing Rate Limit Middleware...\n");

    const requests = [];
    const numRequests = 15; // Exceed the limit of 100 in production

    console.log(`Making ${numRequests} requests to /api/products...`);
    console.log(`Current limit: 100 requests / 15 minutes (production)`);
    console.log(`Current limit: 1000 requests / 15 minutes (development)\n`);

    for (let i = 1; i <= numRequests; i++) {
        requests.push(
            fetch(`${API_URL}/products`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })
                .then(async (res) => {
                    const headers = {
                        rateLimit: res.headers.get("RateLimit-Limit"),
                        rateLimitRemaining: res.headers.get(
                            "RateLimit-Remaining",
                        ),
                        rateLimitReset: res.headers.get("RateLimit-Reset"),
                        retryAfter: res.headers.get("Retry-After"),
                    };

                    const result = {
                        request: i,
                        status: res.status,
                        statusText: res.statusText,
                        headers,
                        timestamp: new Date().toISOString(),
                    };

                    // Try to read response body
                    try {
                        const contentType = res.headers.get("content-type");
                        if (contentType?.includes("application/json")) {
                            result.body = await res.json();
                        } else {
                            result.body = await res.text();
                        }
                    } catch (_err) {
                        result.body = "Could not parse response";
                    }

                    return result;
                })
                .catch((err) => ({
                    request: i,
                    error: err.message,
                    timestamp: new Date().toISOString(),
                })),
        );

        // Small delay to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const results = await Promise.all(requests);

    console.log("\n📊 Results:\n");

    results.forEach((result) => {
        if (result.error) {
            console.log(
                `❌ Request #${result.request}: ERROR - ${result.error}`,
            );
        } else {
            const icon =
                result.status === 200
                    ? "✅"
                    : result.status === 429
                      ? "🚫"
                      : "⚠️";
            console.log(
                `${icon} Request #${result.request}: ${result.status} ${result.statusText}`,
            );

            if (result.headers.rateLimitRemaining !== null) {
                console.log(
                    `   Rate Limit Remaining: ${result.headers.rateLimitRemaining}`,
                );
            }

            if (result.status === 429) {
                console.log(
                    `   Retry After: ${result.headers.retryAfter} seconds`,
                );
                if (result.body && typeof result.body === "object") {
                    console.log(
                        `   Message: ${result.body.error || result.body.message}`,
                    );
                }
            }
        }
    });

    // Summary
    const successful = results.filter((r) => r.status === 200).length;
    const rateLimited = results.filter((r) => r.status === 429).length;
    const errors = results.filter((r) => r.error).length;

    console.log("\n📈 Summary:");
    console.log(`   ✅ Successful (200): ${successful}`);
    console.log(`   🚫 Rate Limited (429): ${rateLimited}`);
    console.log(`   ❌ Errors: ${errors}`);

    console.log(`\n${"=".repeat(50)}`);

    if (rateLimited > 0) {
        console.log("✅ Rate limiter is WORKING correctly!");
        console.log(
            `   Blocked ${rateLimited} requests after limit was reached.`,
        );
    } else if (successful === numRequests) {
        console.log("⚠️  All requests succeeded - might be in DEVELOPMENT mode");
        console.log("   Development mode has 1000 requests / 15 min limit");
    } else {
        console.log("⚠️  Unexpected results - check API configuration");
    }
    console.log("=".repeat(50));
}

// Run the test
testRateLimit().catch(console.error);
