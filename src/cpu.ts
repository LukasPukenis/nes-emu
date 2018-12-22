import { Memory } from './memory';
import { ROM } from './rom';

export type Register = number;

export enum StatusRegister {
    S = 1 << 7,
    O = 1 << 6,
    U = 1 << 5,
    B = 1 << 4,
    D = 1 << 3,
    I = 1 << 2,
    Z = 1 << 1,
    C = 1 << 0
};

enum AddressingModes {
    __NO__MODE__,
    modeAbsolute,
	modeAbsoluteX,
	modeAbsoluteY,
	modeAccumulator,
	modeImmediate,
	modeImplied,
	modeIndexedIndirect,
	modeIndirect,
	modeIndirectIndexed,
	modeRelative,
	modeZeroPage,
	modeZeroPageX,
	modeZeroPageY
};

type OpData = number;

type Opcode = {
    name: string,
    cycles: number;
    page_cost: number;
    size: number;
    addr_mode: AddressingModes;
    op: (cpu: CPU, data: OpData) => void;
};


const opcodes: Opcode[] = [
	{ name: "BRK", cycles: 7, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.BRK(data);} },
	{ name: "ORA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "SLO", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "NOP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "ORA", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "ASL", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);} },
	{ name: "SLO", cycles: 5, page_cost: 0, size: 0, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "PHP", cycles: 3, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PHP(data);} },
	{ name: "ORA", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "ASL", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);} },
	{ name: "ANC", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ANC(data);} },
	{ name: "NOP", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "ORA", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "ASL", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);} },
	{ name: "SLO", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "BPL", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BPL(data);} },
	{ name: "ORA", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "SLO", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "ORA", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "ASL", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);} },
	{ name: "SLO", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "CLC", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLC(data);} },
	{ name: "ORA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "SLO", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "ORA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "ASL", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);} },
	{ name: "SLO", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "JSR", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.JSR(data);} },
	{ name: "AND", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "RLA", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "BIT", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.BIT(data);} },
	{ name: "AND", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "ROL", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);} },
	{ name: "RLA", cycles: 5, page_cost: 0, size: 0, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "PLP", cycles: 4, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PLP(data);} },
	{ name: "AND", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "ROL", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);} },
	{ name: "ANC", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ANC(data);} },
	{ name: "BIT", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BIT(data);} },
	{ name: "AND", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "ROL", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);} },
	{ name: "RLA", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "BMI", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BMI(data);} },
	{ name: "AND", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "RLA", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "AND", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "ROL", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);} },
	{ name: "RLA", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "SEC", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.SEC(data);} },
	{ name: "AND", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "RLA", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "AND", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "ROL", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);} },
	{ name: "RLA", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "RTI", cycles: 6, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.RTI(data);} },
	{ name: "EOR", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "SRE", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "NOP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "EOR", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "LSR", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);} },
	{ name: "SRE", cycles: 5, page_cost: 0, size: 0, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "PHA", cycles: 3, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PHA(data);} },
	{ name: "EOR", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "LSR", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);} },
	{ name: "ALR", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ALR(data);} },
	{ name: "JMP", cycles: 3, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.JMP(data);} },
	{ name: "EOR", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "LSR", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);} },
	{ name: "SRE", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "BVC", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BVC(data);} },
	{ name: "EOR", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "SRE", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "EOR", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "LSR", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);} },
	{ name: "SRE", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "CLI", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLI(data);} },
	{ name: "EOR", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "SRE", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "EOR", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "LSR", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);} },
	{ name: "SRE", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "RTS", cycles: 6, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.RTS(data);} },
	{ name: "ADC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "RRA", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "NOP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "ADC", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "ROR", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);} },
	{ name: "RRA", cycles: 5, page_cost: 0, size: 0, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "PLA", cycles: 4, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PLA(data);} },
	{ name: "ADC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "ROR", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);} },
	{ name: "ARR", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ARR(data);} },
	{ name: "JMP", cycles: 5, page_cost: 0, size: 3, addr_mode: AddressingModes.modeIndirect, op:(cpu: CPU, data: OpData) => { cpu.JMP(data);} },
	{ name: "ADC", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "ROR", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);} },
	{ name: "RRA", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "BVS", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BVS(data);} },
	{ name: "ADC", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "RRA", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "ADC", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "ROR", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);} },
	{ name: "RRA", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "SEI", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.SEI(data);} },
	{ name: "ADC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "RRA", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "ADC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "ROR", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);} },
	{ name: "RRA", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "STA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "SAX", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);} },
	{ name: "STY", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.STY(data);} },
	{ name: "STA", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "STX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.STX(data);} },
	{ name: "SAX", cycles: 3, page_cost: 0, size: 0, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);} },
	{ name: "DEY", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.DEY(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "TXA", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TXA(data);} },
	{ name: "XAA", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.XAA(data);} },
	{ name: "STY", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STY(data);} },
	{ name: "STA", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "STX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STX(data);} },
	{ name: "SAX", cycles: 4, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);} },
	{ name: "BCC", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BCC(data);} },
	{ name: "STA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "AHX", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.AHX(data);} },
	{ name: "STY", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STY(data);} },
	{ name: "STA", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "STX", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STX(data);} },
	{ name: "SAX", cycles: 4, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);} },
	{ name: "TYA", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TYA(data);} },
	{ name: "STA", cycles: 5, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "TXS", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TXS(data);} },
	{ name: "TAS", cycles: 5, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.TAS(data);} },
	{ name: "SHY", cycles: 5, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SHY(data);} },
	{ name: "STA", cycles: 5, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "SHX", cycles: 5, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SHX(data);} },
	{ name: "AHX", cycles: 5, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.AHX(data);} },
	{ name: "LDY", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);} },
	{ name: "LDA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "LDX", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);} },
	{ name: "LAX", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "LDY", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);} },
	{ name: "LDA", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "LDX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);} },
	{ name: "LAX", cycles: 3, page_cost: 0, size: 0, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "TAY", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TAY(data);} },
	{ name: "LDA", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "TAX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TAX(data);} },
	{ name: "LAX", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "LDY", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);} },
	{ name: "LDA", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "LDX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);} },
	{ name: "LAX", cycles: 4, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "BCS", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BCS(data);} },
	{ name: "LDA", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "LAX", cycles: 5, page_cost: 1, size: 0, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "LDY", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);} },
	{ name: "LDA", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "LDX", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);} },
	{ name: "LAX", cycles: 4, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "CLV", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLV(data);} },
	{ name: "LDA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "TSX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TSX(data);} },
	{ name: "LAS", cycles: 4, page_cost: 1, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LAS(data);} },
	{ name: "LDY", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);} },
	{ name: "LDA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "LDX", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);} },
	{ name: "LAX", cycles: 4, page_cost: 1, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "CPY", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.CPY(data);} },
	{ name: "CMP", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "DCP", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "CPY", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.CPY(data);} },
	{ name: "CMP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "DEC", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);} },
	{ name: "DCP", cycles: 5, page_cost: 0, size: 0, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "INY", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.INY(data);} },
	{ name: "CMP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "DEX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.DEX(data);} },
	{ name: "AXS", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.AXS(data);} },
	{ name: "CPY", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.CPY(data);} },
	{ name: "CMP", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "DEC", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);} },
	{ name: "DCP", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "BNE", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BNE(data);} },
	{ name: "CMP", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "DCP", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "CMP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "DEC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);} },
	{ name: "DCP", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "CLD", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLD(data);} },
	{ name: "CMP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "DCP", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "CMP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "DEC", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);} },
	{ name: "DCP", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "CPX", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.CPX(data);} },
	{ name: "SBC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "ISC", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.ISC(data);} },
	{ name: "CPX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.CPX(data);} },
	{ name: "SBC", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "INC", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.INC(data);} },
	{ name: "ISC", cycles: 5, page_cost: 0, size: 0, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ISC(data);} },
	{ name: "INX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.INX(data);} },
	{ name: "SBC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "SBC", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "CPX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.CPX(data);} },
	{ name: "SBC", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "INC", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.INC(data);} },
	{ name: "ISC", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ISC(data);} },
	{ name: "BEQ", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BEQ(data);} },
	{ name: "SBC", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 0, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "ISC", cycles: 8, page_cost: 0, size: 0, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.ISC(data);} },
	{ name: "NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "SBC", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "INC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.INC(data);} },
	{ name: "ISC", cycles: 6, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ISC(data);} },
	{ name: "SED", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.SED(data);} },
	{ name: "SBC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "ISC", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.ISC(data);} },
	{ name: "NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);} },
	{ name: "SBC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "INC", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.INC(data);} },
	{ name: "ISC", cycles: 7, page_cost: 0, size: 0, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ISC(data);} }	
];

/**
 * 
 case modeAbsolute:
		address = cpu.Read16(cpu.PC + 1)
	case modeAbsoluteX:
		address = cpu.Read16(cpu.PC+1) + uint16(cpu.X)
		pageCrossed = pagesDiffer(address-uint16(cpu.X), address)
	case modeAbsoluteY:
		address = cpu.Read16(cpu.PC+1) + uint16(cpu.Y)
		pageCrossed = pagesDiffer(address-uint16(cpu.Y), address)
	case modeAccumulator:
		address = 0
	case modeImmediate:
		address = cpu.PC + 1
	case modeImplied:
		address = 0
	case modeIndexedIndirect:
		address = cpu.read16bug(uint16(cpu.Read(cpu.PC+1) + cpu.X))
	case modeIndirect:
		address = cpu.read16bug(cpu.Read16(cpu.PC + 1))
	case modeIndirectIndexed:
		address = cpu.read16bug(uint16(cpu.Read(cpu.PC+1))) + uint16(cpu.Y)
		pageCrossed = pagesDiffer(address-uint16(cpu.Y), address)
	case modeRelative:
		offset := uint16(cpu.Read(cpu.PC + 1))
		if offset < 0x80 {
			address = cpu.PC + 2 + offset
		} else {
			address = cpu.PC + 2 + offset - 0x100
		}
	case modeZeroPage:
		address = uint16(cpu.Read(cpu.PC + 1))
	case modeZeroPageX:
		address = uint16(cpu.Read(cpu.PC+1)+cpu.X) & 0xff
	case modeZeroPageY:
		address = uint16(cpu.Read(cpu.PC+1)+cpu.Y) & 0xff
 */
const AddressDecoders: any = {
    [AddressingModes.modeAbsolute]: (opcode: Opcode, cpu: CPU) => { return cpu.memory.read16(cpu.PC + 1); },
    [AddressingModes.modeAbsoluteX]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeAbsoluteY]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeAccumulator]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeImmediate]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeImplied]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeIndexedIndirect]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeIndirect]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeIndirectIndexed]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeRelative]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeZeroPage]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeZeroPageX]: (opcode: Opcode, cpu: CPU) => { return 1; },
    [AddressingModes.modeZeroPageY]: (opcode: Opcode, cpu: CPU) => { return 1; }
};

export class CPU {
    memory: Memory;
    private A:  Register;
    private X:  Register;
    private Y:  Register;
    PC: Register;
    private S:  Register;
    private P:  Register;
    private cycles: number;
    private rom: ROM;

    constructor(rom: ROM) {
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.S = 0;
        this.P = 0;
        this.PC = 0;

        this.cycles = 0;
        this.memory = new Memory();
        this.rom = rom;

        let prgrom = this.rom.getPRGROMS()[0];
        console.assert(prgrom.length == 0x4000, prgrom.length, 0x4000);
        
        for (let i = 0; i < prgrom.length; i++) {
            this.memory.write(0xC000+i, prgrom[i]);
        }
        
        this.PC = 0xC000;
    }
    
    step() {        
        let opcode = opcodes[this.memory.read(this.PC)];
        console.log('from', this.PC, '==>', opcode);
        
        let data: OpData = AddressDecoders[opcode.addr_mode](opcode, this);        
        this.PC += opcode.size;
        this.cycles += opcode.cycles;
        opcode.op(this, data);
    }

    // C000  4C F5 C5  JMP $C5F5                       A:00 X:00 Y:00 P:24 SP:FD CYC:  0
    dumpDebug(): string {
        let output: string[] = [];
        output.push(this.PC.toString());

        let out = output.join(' ');
        console.log(out);
        return out;
    }

    // INSTRUCTIONS
    BRK(data: OpData): void {
	
    }
    
    ORA(data: OpData): void {
        
    }
    
    KIL(data: OpData): void {
        
    }
    
    SLO(data: OpData): void {
        
    }
    
    NOP(data: OpData): void {
        
    }
    
    ASL(data: OpData): void {
        
    }
    
    PHP(data: OpData): void {
        
    }
    
    ANC(data: OpData): void {
        
    }
    
    BPL(data: OpData): void {
        
    }
    
    CLC(data: OpData): void {
        
    }
    
    JSR(data: OpData): void {
        
    }
    
    AND(data: OpData): void {
        
    }
    
    RLA(data: OpData): void {
        
    }
    
    BIT(data: OpData): void {
        
    }
    
    ROL(data: OpData): void {
        
    }
    
    PLP(data: OpData): void {
        
    }
    
    BMI(data: OpData): void {
        
    }
    
    SEC(data: OpData): void {
        
    }
    
    RTI(data: OpData): void {
        
    }
    
    EOR(data: OpData): void {
        
    }
    
    SRE(data: OpData): void {
        
    }
    
    LSR(data: OpData): void {
        
    }
    
    PHA(data: OpData): void {
        
    }
    
    ALR(data: OpData): void {
        
    }
    
    JMP(data: OpData): void {
    console.log("JUMP JUMP", data.toString(16)); 
    }
    
    BVC(data: OpData): void {
        
    }
    
    CLI(data: OpData): void {
        
    }
    
    RTS(data: OpData): void {
        
    }
    
    ADC(data: OpData): void {
        
    }
    
    RRA(data: OpData): void {
        
    }
    
    ROR(data: OpData): void {
        
    }
    
    PLA(data: OpData): void {
        
    }
    
    ARR(data: OpData): void {
        
    }
    
    BVS(data: OpData): void {
        
    }
    
    SEI(data: OpData): void {
        
    }
    
    STA(data: OpData): void {
        
    }
    
    SAX(data: OpData): void {
        
    }
    
    STY(data: OpData): void {
        
    }
    
    STX(data: OpData): void {
        
    }
    
    DEY(data: OpData): void {
        
    }
    
    TXA(data: OpData): void {
        
    }
    
    XAA(data: OpData): void {
        
    }
    
    BCC(data: OpData): void {
        
    }
    
    AHX(data: OpData): void {
        
    }
    
    TYA(data: OpData): void {
        
    }
    
    TXS(data: OpData): void {
        
    }
    
    TAS(data: OpData): void {
        
    }
    
    SHY(data: OpData): void {
        
    }
    
    SHX(data: OpData): void {
        
    }
    
    LDY(data: OpData): void {
        
    }
    
    LDA(data: OpData): void {
        
    }
    
    LDX(data: OpData): void {
        
    }
    
    LAX(data: OpData): void {
        
    }
    
    TAY(data: OpData): void {
        
    }
    
    TAX(data: OpData): void {
        
    }
    
    BCS(data: OpData): void {
        
    }
    
    CLV(data: OpData): void {
        
    }
    
    TSX(data: OpData): void {
        
    }
    
    LAS(data: OpData): void {
        
    }
    
    CPY(data: OpData): void {
        
    }
    
    CMP(data: OpData): void {
        
    }
    
    DCP(data: OpData): void {
        
    }
    
    DEC(data: OpData): void {
        
    }
    
    INY(data: OpData): void {
        
    }
    
    DEX(data: OpData): void {
        
    }
    
    AXS(data: OpData): void {
        
    }
    
    BNE(data: OpData): void {
        
    }
    
    CLD(data: OpData): void {
        
    }
    
    CPX(data: OpData): void {
        
    }
    
    SBC(data: OpData): void {
        
    }
    
    ISC(data: OpData): void {
        
    }
    
    INC(data: OpData): void {
        
    }
    
    INX(data: OpData): void {
        
    }
    
    BEQ(data: OpData): void {
        
    }
    
    SED(data: OpData): void {
        
    }
    
}