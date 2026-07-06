import React from 'react';
import dynamic from 'next/dynamic';

const MicroscopeViewer = dynamic(() => import('../components/MicroscopeViewer'), { ssr: false });

const MicroscopeTest: React.FC = () => {
    return (
        <div>
            <h1>Microscope Viewer Test</h1>
            <MicroscopeViewer />
        </div>
    );
};

export default MicroscopeTest;
