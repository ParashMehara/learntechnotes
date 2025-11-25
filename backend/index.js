import dotenv from "dotenv";
dotenv.config();
import express from "express";
import Razorpay from "razorpay";
import cors from "cors";
import crypto from "crypto";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// Simple in-memory token store
const tokens = {};

// Razorpay setup
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ==============================
// 1️⃣ Create Order Route
// ==============================
app.post("/create-order", async (req, res) => {
    try {
        const options = {
            amount: req.body.amount * 100,
            currency: "INR",
            receipt: "receipt_" + Date.now()
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        res.status(500).send("Error creating order");
    }
});

// ==============================
// 2️⃣ Verify Payment + Generate Secure Token
// ==============================
app.post("/verify-payment", (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseName } = req.body;

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {

        // Temporary 5 min token
        const token = crypto.randomBytes(20).toString("hex");
        const expiry = Date.now() + 5 * 60 * 1000;

        // Store which course this token belongs to
        tokens[token] = { expiry, course: courseName };

        res.json({
            success: true,
            downloadUrl: `https://learntechnotes.onrender.com/download/${token}`
        });

    } else {
        res.json({ success: false });
    }
});

// ==============================
// 3️⃣ Secure Download Route
// ==============================
app.get("/download/:token", (req, res) => {
    const token = req.params.token;

    // Token validation
    if (!tokens[token] || tokens[token].expiry < Date.now()) {
        return res.status(403).send("Invalid or expired download link");
    }

    const course = tokens[token].course;

    // Delete token after one use
    delete tokens[token];

    const __dirname = path.resolve();

    // COURSE-WISE SECURE LOCAL HTML FILE SERVING
    if (course === "C Language Notes") {
    return res.redirect("https://drive.google.com/file/d/1A9TOmPqxol29Vo4NQxNMXZ4ym_XDEFPf/view?usp=drivesdk");
	}

	if (course === "Web Development Notes") {
    return res.redirect("https://drive.google.com/file/d/1T7Sa8a6EPciOSycRFjGZE-Bs4AFDPBhE/view?usp=drivesdk");
	}


	if (course === "Java Notes") {
    return res.redirect("YOUR_JAVA_PDF_DRIVE_LINK");
	}

    res.status(400).send("Invalid course mapping");
});

// ==============================
// Server Start
// ==============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});

