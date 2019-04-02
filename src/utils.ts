export const Utils = {
    prettyHex: (data: number, padStart = 4) => {
        return data.toString(16).toUpperCase().padStart(padStart, '0');
    }    
}
