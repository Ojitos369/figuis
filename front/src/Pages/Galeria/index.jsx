import { localStates, localEffects } from './localStates';
import { PageHeader } from './components/PageHeader';
import { FigurasGrid } from './components/FigurasGrid';
import { DetailModal } from './components/DetailModal';
import { FiltersSheet } from './components/FiltersSheet';
import { Pagination } from '../../Components/Pagination';

export const Galeria = () => {
    const ls = localStates();
    localEffects(ls);

    return (
        <div className={ls.style.galeriaPage}>
            <PageHeader ls={ls} />
            <Pagination pagination={ls.pagination} onChange={ls.setPage} getHref={ls.getPageHref} />
            <FigurasGrid ls={ls} />
            <Pagination pagination={ls.pagination} onChange={ls.setPage} getHref={ls.getPageHref} />
            <DetailModal ls={ls} />
            <FiltersSheet ls={ls} />
        </div>
    );
};
