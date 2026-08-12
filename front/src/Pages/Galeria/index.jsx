import { localStates, localEffects } from './localStates';
import { PageHeader } from './components/PageHeader';
import { FigurasGrid } from './components/FigurasGrid';
import { DetailModal } from './components/DetailModal';
import { Pagination } from '../../Components/Pagination';

export const Galeria = () => {
    const ls = localStates();
    localEffects(ls);

    return (
        <div className={ls.style.galeriaPage}>
            <PageHeader ls={ls} />
            <FigurasGrid ls={ls} />
            <Pagination pagination={ls.pagination} onChange={ls.setPage} />
            <DetailModal ls={ls} />
        </div>
    );
};
