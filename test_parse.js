const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const fields = await prisma.field.findMany({ take: 1 });
    if(fields.length === 0) { console.log('No fields'); return; }
    const fieldId = fields[0].id;
    const body = {
        fieldId,
        params: { irrigationChange: 10, temperature: 28, nitrogenLevel: 0.8 }
    };
    console.log("Testing with fieldId:", fieldId);
    try {
        const res = await fetch('http://192.168.0.148:3000/api/aerotwin/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        console.log(res.status);
        const json = await res.json();
        console.log(json);
    } catch (e) { console.error(e); }
}
run().catch(console.error).finally(() => prisma.$disconnect());
