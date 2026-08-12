import { Skeleton } from '../../../../Components/Skeleton';

export const FiguraCardSkeleton = ({ style }) => (
    <div className={style.figuraCard}>
        <Skeleton className={style.thumb} />
        <div className={style.body}>
            <Skeleton style={{ height: 14, width: '75%', borderRadius: 4 }} />
            <Skeleton style={{ height: 11, width: '40%', borderRadius: 4, marginTop: 4 }} />
        </div>
    </div>
);
