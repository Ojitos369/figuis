import { useEffect, useState, lazy, Suspense } from 'react';
import { useStates } from '../../../Hooks/useStates';
import { SheetModal } from '../../../Components/SheetModal';
import { Tag } from '../../../Components/Tag';
import { Loader } from '../../../Components/Loader';
import { MediaThumb } from '../../../Components/MediaThumb';
import { MediaViewer } from '../../../Components/MediaViewer';
import { ReactionBar } from '../../../Components/ReactionBar';
import { mediaUrl } from '../../../constants/api';

// three.js + fiber/drei pesan bastante: solo se descargan si el usuario
// realmente activa la previsualizacion 3D.
const STLViewer = lazy(() => import('../../../Components/STLViewer').then(m => ({ default: m.STLViewer })));

export const DetailModal = ({ ls }) => {
    const { f } = useStates();
    const { style, id, figuraActual, loadingDetail, closeDetail } = ls;
    const [activeIdx, setActiveIdx] = useState(0);
    const [show3D, setShow3D] = useState(false);

    const open = !!id;
    const notFound = open && figuraActual === false;
    const data = open && figuraActual ? figuraActual : null;
    const gallery = data ? [...(data.resultado || []), ...(data.relacionados || [])] : [];
    const modelo3d = data?.modelos_3d?.[0];

    useEffect(() => { setActiveIdx(0); setShow3D(false); }, [id]);

    const share = () => {
        const url = `${window.location.origin}${window.location.pathname}#/figura/${id}`;
        if (navigator.share) {
            navigator.share({ title: data?.nombre, url }).catch(() => {});
            return;
        }
        navigator.clipboard?.writeText(url).then(() => {
            f.general.notificacion({ title: 'Listo', message: 'Enlace copiado al portapapeles', mode: 'success' });
        });
    };

    return (
        <SheetModal open={open} onClose={closeDetail} title={data?.nombre || (notFound ? 'No encontrada' : 'Cargando...')} maxWidth="640px">
            {loadingDetail && !data && (
                <div className={style.detailLoader}><Loader label="Cargando..." /></div>
            )}

            {notFound && (
                <div className={style.detailEmpty}>Esta figura no existe o ya no está disponible.</div>
            )}

            {!!data && (
                <div className={style.detailBody}>
                    {show3D && modelo3d ? (
                        <div className={style.mainViewer}>
                            <Suspense fallback={<div className={style.detailLoader}><Loader label="Cargando visor 3D..." /></div>}>
                                <STLViewer url={mediaUrl(modelo3d.archivo_url)} />
                            </Suspense>
                        </div>
                    ) : !!gallery.length && (
                        <>
                            <div className={style.mainViewer}>
                                <MediaViewer url={gallery[activeIdx]?.archivo_url} alt={data.nombre} />
                            </div>
                            {gallery.length > 1 && (
                                <div className={style.thumbStrip}>
                                    {gallery.map((a, i) => (
                                        <button
                                            key={a.id}
                                            type="button"
                                            className={`${style.thumbBtn} ${i === activeIdx ? style.thumbActive : ''}`}
                                            onClick={() => setActiveIdx(i)}
                                        >
                                            <MediaThumb url={a.archivo_url} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {!!modelo3d && (
                        <button type="button" className={style.view3dBtn} onClick={() => setShow3D(v => !v)}>
                            {show3D ? '🖼 Ver fotos' : '🧊 Previsualizar en 3D'}
                        </button>
                    )}

                    {!!data.etiquetas?.length && (
                        <div className={style.detailTags}>
                            {data.etiquetas.map(e => (
                                <Tag key={e.id} nombre={e.nombre} color={e.color} />
                            ))}
                        </div>
                    )}

                    {!!data.descripcion && (
                        <p className={style.detailDesc}>{data.descripcion}</p>
                    )}

                    <ReactionBar figuraId={data.id} reacciones={data.reacciones} misReacciones={data.mis_reacciones} />

                    <button type="button" className={style.shareBtn} onClick={share}>
                        🔗 Compartir
                    </button>
                </div>
            )}
        </SheetModal>
    );
};
