export const cloudFunctionCode = `import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Automatical invoice generation function
 * Triggers on the 1st day of every month at 00:00 (Midnight)
 * Cron Expression: "0 0 1 * *"
 */
export const autoGenerateMonthlyInvoices = functions.pubsub
  .schedule("0 0 1 * *")
  .timeZone("Asia/Dhaka")
  .onRun(async (context) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1; // getMonth is 0-indexed
    const formattedMonth = \`\${currentYear}-\${currentMonthNum.toString().padStart(2, "0")}\`;

    console.log(\`Starting automated invoice generation for month: \${formattedMonth}\`);

    try {
      // 1. Fetch all active customers
      const customersSnap = await db
        .collection("customers")
        .where("status", "==", "active")
        .get();

      if (customersSnap.empty) {
        console.log("No active customers found to invoice.");
        return null;
      }

      // 2. Fetch all broadband speed packages to calculate pricing
      const packagesSnap = await db.collection("packages").get();
      const packagesMap = new Map<string, any>();
      packagesSnap.forEach((doc) => {
        packagesMap.set(doc.id, doc.data());
      });

      const batch = db.batch();
      let invoiceCount = 0;

      // 3. Generate invoices for each customer
      for (const docOfCust of customersSnap.docs) {
        const customer = docOfCust.data();
        const pkg = packagesMap.get(customer.packageId);
        
        if (!pkg) {
          console.warn(\`Package not found for customer: \${customer.name} (ID: \${docOfCust.id})\`);
          continue;
        }

        const invoiceId = \`INV-\${docOfCust.id}-\${formattedMonth}\`;
        const invoiceRef = db.collection("invoices").doc(invoiceId);

        // Check if invoice already exists to avoid duplication
        const existingInvoice = await invoiceRef.get();
        if (existingInvoice.exists) {
          console.log(\`Invoice already exists for customer \${customer.name} (ID: \${docOfCust.id}) for \${formattedMonth}\`);
          continue;
        }

        // Add monthly billing amount to customer's outstanding dueAmount
        const currentDue = customer.dueAmount || 0;
        const newDueAmount = currentDue + pkg.price;

        // Update customer's outstanding dues
        const customerRef = db.collection("customers").doc(docOfCust.id);
        batch.update(customerRef, { dueAmount: newDueAmount });

        // Write invoice document
        batch.set(invoiceRef, {
          id: invoiceId,
          customerId: docOfCust.id,
          customerName: customer.name,
          amount: pkg.price,
          month: formattedMonth,
          status: "unpaid",
          createdAt: new Date().toISOString(),
        });

        invoiceCount++;
      }

      // Commit the batch writes
      await batch.commit();
      console.log(\`Successfully generated \${invoiceCount} invoices and updated customer balances for month: \${formattedMonth}\`);
      return null;
    } catch (error) {
      console.error("Error generating monthly invoices automatically:", error);
      throw error;
    }
  });
`;
