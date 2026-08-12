import { Skeleton } from '../../../Components/Skeleton';

// Mismo alto/forma que FigCard, para que el grid no salte cuando llegan los datos reales.
export const FigCardSkeleton = ({ style }) => (
    <div className={style.figCard}>
        <Skeleton className={style.figThumb} />
        <div className={style.figBody}>
            <Skeleton style={{ height: 14, width: '70%', borderRadius: 4 }} />
            <div className={style.figTags}>
                <Skeleton style={{ height: 18, width: 46, borderRadius: 999 }} />
                <Skeleton style={{ height: 18, width: 34, borderRadius: 999 }} />
            </div>
            <div className={style.figReactions} />
        </div>
    </div>
);
