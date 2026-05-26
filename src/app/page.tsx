import WeatherCard    from '@/components/weather/WeatherCard';
import { RedditHotList } from '@/components/reddit/RedditHotList';
import { WeiboHotList }  from '@/components/weibo/WeiboHotList';
import { ZhihuHotList }     from '@/components/zhihu/ZhihuHotList';
import { WorkplaceHotList } from '@/components/workplace/WorkplaceHotList';
import { GetGoHotList }     from '@/components/getgo/GetGoHotList';
import SettingsButton from '@/components/shared/SettingsButton';

export default function Home() {
  return (
    <main className="min-h-screen bg-page">
      <SettingsButton />
      <div className="grid grid-cols-3 items-start">
        {/* Col 1 */}
        <div className="col-span-3 lg:col-span-1 flex flex-col">
          <div className="border-2 border-divider"><WeatherCard /></div>
          <div className="border-2 border-divider"><GetGoHotList /></div>
          <div className="border-2 border-divider"><WorkplaceHotList /></div>
        </div>

        {/* Col 2 */}
        <div className="col-span-3 lg:col-span-1 flex flex-col">
          <div className="border-2 border-divider"><RedditHotList /></div>
        </div>

        {/* Col 3 */}
        <div className="col-span-3 lg:col-span-1 flex flex-col">
          <div className="border-2 border-divider"><WeiboHotList /></div>
          <div className="border-2 border-divider"><ZhihuHotList /></div>
        </div>
      </div>
    </main>
  );
}
