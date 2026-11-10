import React from 'react';
import {Composition} from 'remotion';
import {Biblioteca, DURATION} from './b/Biblioteca';
import './fonts';

export const Root: React.FC = () => (
	<Composition id="Biblioteca" component={Biblioteca} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
);
