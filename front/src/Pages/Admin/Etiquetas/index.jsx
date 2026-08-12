import { localStates, localEffects } from './localStates';
import { Tag } from '../../../Components/Tag';
import { ColorField } from '../../../Components/ColorField';

const PRESET_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#38bdf8', '#ec4899', '#a855f7', '#14b8a6'];

export const AdminEtiquetas = () => {
    const ls = localStates();
    localEffects(ls);
    const { style } = ls;

    return (
        <div className={style.adminEtiquetas}>
            <form className={style.form} onSubmit={ls.submit}>
                <input
                    type="text"
                    placeholder="Nombre de la etiqueta"
                    value={ls.nombre}
                    onChange={e => ls.setNombre(e.target.value)}
                    className={style.nameInput}
                />
                <ColorField value={ls.color} onChange={ls.setColor} />
                <div className={style.presets}>
                    {PRESET_COLORS.map(c => (
                        <button
                            key={c}
                            type="button"
                            className={style.presetDot}
                            style={{ background: c, outline: ls.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                            onClick={() => ls.setColor(c)}
                            aria-label={c}
                        />
                    ))}
                </div>
                <div className={style.formActions}>
                    {ls.editId && (
                        <button type="button" className={style.cancelBtn} onClick={ls.startCreate}>Cancelar</button>
                    )}
                    <button type="submit" className={style.saveBtn} disabled={ls.saving || !ls.nombre.trim()}>
                        {ls.editId ? 'Guardar cambios' : 'Agregar etiqueta'}
                    </button>
                </div>
            </form>

            <div className={style.list}>
                {ls.etiquetas.length === 0 && (
                    <div className={style.emptyState}>Aún no hay etiquetas.</div>
                )}
                {ls.etiquetas.map(et => (
                    <div key={et.id} className={style.row}>
                        <Tag nombre={et.nombre} color={et.color} />
                        <span className={style.count}>{et.num_figuras || 0} figura{et.num_figuras !== 1 ? 's' : ''}</span>
                        <div className={style.rowActions}>
                            <button type="button" onClick={() => ls.startEdit(et)}>Editar</button>
                            <button type="button" className={style.delete} onClick={() => ls.remove(et)}>Eliminar</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
