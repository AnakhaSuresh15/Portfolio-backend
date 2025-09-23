// server.js
const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const net = require("net");

const app = express();
const PORT = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(bodyParser.json());

// Create transporter factory (uses env vars)
function createTransporter() {
  // prefer explicit host/port rather than 'service' for clarity
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true", // true for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // App Password or OAuth2 token
    },
    logger: true,
    debug: true,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
}

// health / debug endpoint to check TCP connectivity & SMTP verify
app.get("/smtp-test", async (req, res) => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);

  // 1) TCP test
  const tcpTimeout = 10000;
  const socket = net.createConnection(
    { host, port, timeout: tcpTimeout },
    () => {
      socket.end();
    }
  );

  socket.on("error", (e) => {
    console.error("TCP error:", e.code || e.message);
    return res
      .status(502)
      .json({ ok: false, stage: "tcp", error: e.code || e.message });
  });

  socket.on("timeout", () => {
    console.error("TCP connect timeout");
    socket.destroy();
    return res
      .status(504)
      .json({ ok: false, stage: "tcp", error: "connect timeout" });
  });

  socket.on("end", async () => {
    // 2) SMTP verify
    const transporter = createTransporter();
    try {
      await transporter.verify();
      console.log("SMTP verify OK");
      res.json({ ok: true, stage: "smtp_verify", message: "SMTP verify OK" });
    } catch (err) {
      console.error(
        "SMTP verify failed:",
        err && (err.code || err.message) ? err.code || err.message : err
      );
      res.status(502).json({
        ok: false,
        stage: "smtp_verify",
        error:
          err && (err.code || err.message)
            ? err.code || err.message
            : String(err),
      });
    }
  });
});

// POST endpoint to receive form data
app.post("/send", async (req, res) => {
  const { email, message } = req.body;
  if (!email || !message)
    return res
      .status(400)
      .json({ success: false, message: "email and message required" });

  const transporter = createTransporter();

  // Use YOUR verified address as 'from' to avoid provider rejection;
  // set replyTo to the user's email so you can reply directly.
  const mailOptions = {
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    replyTo: email,
    to: process.env.MAIL_TO || process.env.SMTP_USER,
    subject: `Portfolio Contact Form: ${email}`,
    text: `Email: ${email}\n\nMessage:\n${message}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("send success:", info && info.messageId);
    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("sendMail error:", error);
    // include error summary but don't leak secrets
    res.status(500).json({
      success: false,
      message: "Email failed to send.",
      error:
        error && (error.code || error.message)
          ? error.code || error.message
          : String(error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (port ${PORT})`);
});
