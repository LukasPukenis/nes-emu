module.exports = {
  "roots": [
    "<rootDir>/src",
    "<rootDir>/tests"
  ],
  "preset": 'ts-jest',
  "transform": {
    "^.+\\.ts$": "ts-jest",
    "^.+\\.js$": "babel-jest",
  },
  
  "moduleDirectories": [
    "node_modules"
  ],

  "setupFiles": [
    
  ],
  "verbose": false,
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
}