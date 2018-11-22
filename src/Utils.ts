export const Utils = {
    getRandomColor: (prependHash: boolean = true) => {
        var letters = '0123456789ABCDEF';
        var color = prependHash ? '#' : '';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
      }
}
