import React, { useEffect, useRef } from 'react';
import OpenSeadragon from 'openseadragon';

const MicroscopeViewer: React.FC = () => {
    const viewerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (viewerRef.current) {
            const viewer = OpenSeadragon({
                element: viewerRef.current,
                prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
                tileSources: "https://openseadragon.github.io/example-images/highsmith/highsmith.dzi",
            });

            return () => {
                viewer.destroy();
            };
        }
    }, []);

    return <div ref={viewerRef} style={{ width: '100%', height: '600px' }} />;
};

export default MicroscopeViewer;
