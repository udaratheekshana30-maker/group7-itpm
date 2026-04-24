// backend/src/utils/emailHelper.js
const https = require('https');

/**
 * Sends an email using Brevo's HTTP API (v3).
 * Uses native Node.js 'https' for reliable cloud deployment.
 */
const sendEmail = async ({ email, subject, message }) => {
    if (!process.env.SMTP_PASS || !process.env.EMAIL_FROM) {
        console.error('[EmailHelper] Missing SMTP_PASS or EMAIL_FROM environment variables.');
        return { success: false, error: 'Email configuration error' };
    }

    const apiKey = process.env.SMTP_PASS.trim();
    const payload = JSON.stringify({
        sender: { 
            name: process.env.FROM_NAME || 'SLIIT Hostel', 
            email: process.env.EMAIL_FROM 
        },
        to: [{ email: email }],
        subject: subject,
        htmlContent: message
    });

    return new Promise((resolve) => {
        const options = {
            hostname: 'api.brevo.com',
            port: 443,
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'api-key': apiKey,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ success: true });
                    } else {
                        console.error('[EmailHelper] API Error:', parsedData);
                        resolve({ 
                            success: false, 
                            error: `API ${res.statusCode}: ${parsedData.message || 'Unknown error'}` 
                        });
                    }
                } catch (e) {
                    resolve({ success: false, error: 'Malformed response from email server' });
                }
            });
        });

        req.on('error', (error) => {
            console.error('[EmailHelper] Network error:', error.message);
            resolve({ success: false, error: `Network error: ${error.message}` });
        });

        req.write(payload);
        req.end();
    });
};

module.exports = sendEmail;
