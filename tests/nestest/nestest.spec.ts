const fs = require('mz/fs');
import { NES } from '../../src/nes';

declare var __dirname: any;

test("nestest.nes rom", async () => {
    const dirname = '';//__dirname;

    try {
        const data = await fs.readFile(dirname + 'tests/nestest/nestest.log');
        let whole = data.toString();
        let lines = whole.split('\n');

        let nes = new NES(null);
        await nes.load(dirname + 'tests/nestest/nestest.nes', 0xC000);
        // nes.getCPU().step();
        for (let line of lines) {
            nes.getCPU().step();
            let dump = nes.getCPU().dumpDebug();           
            line = line.replace(/\s{2,}/g, ' ');

            expect(dump).toEqual(line);
        }

        console.log("Checked ", lines.length, 'lines');
        console.log("Results ", nes.getMemory().read(2), 'and', nes.getMemory().read(3))
    } catch(e) {
        throw e;
    }
});
