document.getElementById('year').innerText = new Date().getFullYear();

function toggleMenu() {
    document.getElementById("navMenu").classList.toggle("show");
}

async function buyNow(courseName, amount) {

    
    const response = await fetch("https://learntechnotes.onrender.com/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount })
    });

    const order = await response.json();

   
    const options = {
        key: "rzp_live_Rkofka2CCmU3R8",
        amount: order.amount,
        currency: "INR",
        name: "LearnTechNotes",
        description: courseName,
        order_id: order.id,

        handler: async function (response) {

            const verifyResponse = await fetch("https://learntechnotes.onrender.com/verify-payment", {
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
