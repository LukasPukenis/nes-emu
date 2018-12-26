const fs = require('mz/fs');

declare var __dirname: any;

test("belenka", async () => {
    try {
        const data = await fs.readFile(__dirname + '/nestest.log');
        let whole = data.toString();
        let lines = whole.split('\n');
        console.log(lines[0]);
        console.log(lines[2]);
        console.log(lines[4]);
        
    } catch(e) {
        console.log(e);
    }
});
