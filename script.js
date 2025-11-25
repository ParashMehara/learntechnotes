document.getElementById('year').innerText = new Date().getFullYear();

function toggleMenu() {
    document.getElementById("navMenu").classList.toggle("show");
}

async function buyNow(courseName, amount) {

    // Step 1 → Backend se order banao
    const response = await fetch("https://learntechnotes.onrender.com/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount })
    });

    const order = await response.json();

    // Step 2 → Razorpay checkout open karo
    const options = {
        key: "rzp_test_RjWkVG2nH4bMzs",
        amount: order.amount,
        currency: "INR",
        name: "LearnTechNotes",
        description: courseName,
        order_id: order.id,

        handler: async function (response) {

            const verifyResponse = await fetch("http://localhost:5000/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    courseName: courseName   // ⭐ Sahi jagah, sahi format
                })
            });

            const verifyResult = await verifyResponse.json();

            if (verifyResult.success) {
                alert("Payment successful! Downloading your notes...");

                // Backend ke token-based secure route ko open karo
                window.location.href = verifyResult.downloadUrl;

            } else {
                alert("Payment verification failed. Please contact support.");
            }
        },

        theme: {
            color: "#ffd700"
        }
    };

    const razor = new Razorpay(options);
    razor.open();
}
