const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 5000;

// middleware
app.use(cors());
app.use(bodyParser.json());

// POST endpoint to receive form data
app.post("/send", async (req, res) => {
  const { email, message } = req.body;

  // transporter: configure your email provider
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "anakhasuresh15@gmail.com",
      pass: "desh zjnn dtjh hwiq", // ⚠️ not your real Gmail password, but an App Password
    },
  });

  // mail options
  let mailOptions = {
    from: email, // sender (user’s email)
    to: "anakhasuresh15@gmail.com", // where you want to receive it
    subject: `Portfolio Contact Form: ${email}`,
    text: `
      Email: ${email}
      Message: ${message}
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Email failed to send." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
