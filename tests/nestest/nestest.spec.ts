const fs = require('mz/fs');
import { NES } from '../../src/nes';

declare var __dirname: any;

test("nestest.nes rom", async () => {
    try {
        const data = await fs.readFile(__dirname + '/nestest.log');
        let whole = data.toString();
        let lines = whole.split('\n');

        let nes = new NES(null);
        await nes.load('tests/nestest/nestest.nes', 0xC000);

        // nes.getCPU().step();
        for (let line of lines) {            
            nes.getCPU().step();
            let dump = nes.getCPU().dumpDebug();           
            line = line.replace(/\s{2,}/g, ' ');

            expect(dump).toEqual(line);
        }
    } catch(e) {
        throw e;
    }
});
