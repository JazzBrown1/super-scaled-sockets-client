import babel from 'rollup-plugin-babel';
import minify from 'rollup-plugin-babel-minify';
import cleanup from 'rollup-plugin-cleanup';
import resolve from 'rollup-plugin-node-resolve';


export default [
  {
    input: 'src/index-cjs.js',
    plugins: [
      babel({
        exclude: 'node_modules/**'
      })
    ],
    output: [
      {
        file: './dist/main.js',
        format: 'cjs',
        name: 'super-scaled-sockets-client',
        globals: { 'jazzy-utility': 'jazzyUtility'}
      }
    ],
    external: ['jazzy-utility'],
  },
  {
    input: 'src/index.js',
    plugins: [
      babel({
        exclude: 'node_modules/**'
      }),
      cleanup({
        comments: 'none'
      })
    ],
    output: [
      {
        file: './dist/module.js',
        format: 'esm',
        name: 'super-scaled-sockets-client'
      }
    ],
    external: ['jazzy-utility'],
  },
  {
    input: 'src/index-cjs.js',
    plugins: [
      babel({
        exclude: 'node_modules/**'
      }),
      resolve({
        mainFields: ['module', 'main'], // Default: ['module', 'main']
      }),
      cleanup({
        comments: 'none'
      }),
      minify({
        // Options for babel-minify.
      })
    ],
    output: [
      {
        file: './dist/super-scaled-sockets-client-min.js',
        name: 'super-scaled-sockets-client',
        format: 'umd'
      }
    ]
  }
];
