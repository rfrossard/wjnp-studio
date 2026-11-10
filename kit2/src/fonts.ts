import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const fontsReady = Promise.all([
	loadFont({family: 'Archivo', url: staticFile('fonts/archivo-latin-700-normal.woff2'), weight: '700'}),
	loadFont({family: 'Archivo', url: staticFile('fonts/archivo-latin-800-normal.woff2'), weight: '800'}),
	loadFont({family: 'IBM Plex Mono', url: staticFile('fonts/ibm-plex-mono-latin-400-normal.woff2'), weight: '400'}),
	loadFont({family: 'IBM Plex Mono', url: staticFile('fonts/ibm-plex-mono-latin-500-normal.woff2'), weight: '500'}),
]);

export const fontsReady2 = Promise.all([
	loadFont({family: 'Caveat', url: staticFile('fonts/caveat-latin-700-normal.woff2'), weight: '700'}),
	loadFont({family: 'Bangers', url: staticFile('fonts/bangers-latin-400-normal.woff2'), weight: '400'}),
	loadFont({family: 'Press Start 2P', url: staticFile('fonts/press-start-2p-latin-400-normal.woff2'), weight: '400'}),
	loadFont({family: 'Comic Neue', url: staticFile('fonts/comic-neue-latin-700-normal.woff2'), weight: '700'}),
]);
