import { localStates, localEffects } from './localStates';

export const AdminSesiones = () => {
    const ls = localStates();
    localEffects(ls);
    const { style } = ls;

    return (
        <div className={style.adminSesiones}>
            <div className={style.list}>
                {!ls.loading && ls.sesiones.length === 0 && (
                    <div className={style.emptyState}>No hay sesiones abiertas.</div>
                )}
                {ls.sesiones.map(sesion => (
                    <div key={sesion.id} className={style.row}>
                        <div className={style.info}>
                            <span className={style.usuario}>
                                {sesion.nombre || sesion.usuario}
                                {sesion.actual && <span className={style.badge}>esta sesión</span>}
                            </span>
                            <span className={style.fecha}>
                                Abierta el {new Date(sesion.created_at).toLocaleString('es-MX')}
                            </span>
                        </div>
                        <button type="button" className={style.closeBtn} onClick={() => ls.cerrar(sesion)}>
                            Cerrar sesión
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
