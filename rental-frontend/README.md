# RentEase – Rental Management Frontend (Buildaton 2.0, PS-2)
React + Vite + react-router. Runs fully offline using a localStorage mock backend in `src/store.js`.

    npm install
    npm run dev

Demo logins: admin@demo.com / admin · user@demo.com / user

Replace functions in `src/store.js` with real API calls (fetch) when your backend is ready:
auth, createQuote/confirmOrder/pay (Stripe/Razorpay), pickup/returnOrder, report, askAI (call your LLM/RAG endpoint).
