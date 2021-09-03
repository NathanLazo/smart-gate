import { useTranslation } from 'react-i18next';

import { useFormatDate, useHistoryCompactListData } from '../../../hooks';
import useHistoryEventLabel from '../../../hooks/useHistoryEventLabel';
import { TrashIcon } from '../../../icons';
import Swipeout from '../../Swipeout';
import {
  DayLabel,
  EventLabel,
  ListCard,
  RecordIconCircle,
  RecordRow,
  SingleDayRecordsWrapper,
  StyledPowerSupplyIcon,
  StyleOpenLockIcon,
  TimeLabel,
} from './HistoryCompactList.styled';

const HistoryCompactList = () => {
  const { t } = useTranslation();
  const formatDate = useFormatDate();
  const mapHistoryEventToLabel = useHistoryEventLabel(true);
  const history = useHistoryCompactListData();

  return (
    <ListCard>
      {history.map(([dateKey, records]) => (
        <div key={dateKey}>
          <DayLabel>{dateKey}</DayLabel>
          <SingleDayRecordsWrapper>
            {records.map(({ id, event, createdAt, user }, index) => (
              <Swipeout
                key={id}
                right={[
                  {
                    order: 1,
                    component: <TrashIcon />,
                    onPress: () => console.log('delete history record'),
                    background: 'red',
                    borderRadius: '12px 0 0 12px',
                  },
                ]}
                autoClose
              >
                <RecordRow>
                  <TimeLabel>{formatDate(createdAt, { timeStyle: 'short' })}</TimeLabel>
                  <RecordIconCircle event={event} firstRecord={!index}>
                    {user ? <StyleOpenLockIcon /> : <StyledPowerSupplyIcon />}
                  </RecordIconCircle>
                  <p>{user ? `${user?.firstName} ${user?.lastName}` : t('history.device')}</p>
                  <EventLabel>{mapHistoryEventToLabel(event)}</EventLabel>
                </RecordRow>
              </Swipeout>
            ))}
          </SingleDayRecordsWrapper>
        </div>
      ))}
    </ListCard>
  );
};

export default HistoryCompactList;
