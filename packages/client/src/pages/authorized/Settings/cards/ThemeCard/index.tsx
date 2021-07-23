import React from 'react';
import { useTranslation } from 'react-i18next';
import { MoonIcon, SunIcon, SystemThemeIcon } from 'src/icons';

import { SelectCard } from '../../../../../elements';
import { ThemeTypeIndicator } from '../../../../../elements/animations';
import { SelectCardOption } from '../../../../../elements/inputs/SelectCard/SelectCard.types';
import { useThemeType } from '../../../../../hooks';
import { StoredThemeType } from '../../../../../theme/Theme';
import SettingsCard from '../SettingsCard';

const ThemeCard = () => {
  const { themeType, storedThemeType, setThemeType } = useThemeType();
  const { t } = useTranslation();

  const titleIcon = <ThemeTypeIndicator themeType={themeType} />;

  const onChange = (selectedOption: SelectCardOption<StoredThemeType>) => {
    setThemeType(selectedOption.value);
  };

  return (
    <SettingsCard title="routes.settings.theme.title" titleIcon={titleIcon}>
      <SelectCard<StoredThemeType> value={storedThemeType} onChange={onChange}>
        <option value="dark">
          <MoonIcon />
          <h5>{t('routes.settings.theme.dark')}</h5>
        </option>
        <option value="light">
          <SunIcon />
          <h5>{t('routes.settings.theme.light')}</h5>
        </option>
        <option value="system">
          <SystemThemeIcon />
          <h5>{t('routes.settings.theme.system')}</h5>
        </option>
      </SelectCard>
    </SettingsCard>
  );
};

export default ThemeCard;
