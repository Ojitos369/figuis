import { useEffect, useState } from 'react';
import { useStates } from '../../../Hooks/useStates';
import { SheetModal } from '../../../Components/SheetModal';
import { Tag } from '../../../Components/Tag';
import { Loader } from '../../../Components/Loader';
import { MediaThumb } from '../../../Components/MediaThumb';
import { MediaViewer } from '../../../Components/MediaViewer';

export const DetailModal = ({ ls }) => {
    const { f } = useStates();
    const { style, id, figuraActual, loadingDetail, closeDetail } = ls;
    const [activeIdx, setActiveIdx] = useState(0);

    const open = !!id;
    const notFound = open && figuraActual === false;
    const data = open && figuraActual ? figuraActual : null;
    const gallery = data ? [...(data.resultado || []), ...(data.relacionados || [])] : [];

    useEffect(() => { setActiveIdx(0); }, [id]);

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
                    {!!gallery.length && (
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

                    <button type="button" className={style.shareBtn} onClick={share}>
                        🔗 Compartir
                    </button>
                </div>
            )}
        </SheetModal>
    );
};
