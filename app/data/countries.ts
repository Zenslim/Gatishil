// app/data/countries.ts
// Full dataset of country dial codes with flags.
// Nepal 🇳🇵 (+977) is pinned first, others alphabetical.
// Provides both an array (for dropdowns) and a map (for quick lookups).

export type CountryDial = {
  flag: string;
  dial: string;
};

export const COUNTRIES: CountryDial[] = [
  { flag: '🇳🇵', dial: '977' }, // Nepal (default)

  { flag: '🇦🇫', dial: '93' },   // Afghanistan
  { flag: '🇦🇱', dial: '355' },  // Albania
  { flag: '🇩🇿', dial: '213' },  // Algeria
  { flag: '🇦🇸', dial: '1684' }, // American Samoa
  { flag: '🇦🇩', dial: '376' },  // Andorra
  { flag: '🇦🇴', dial: '244' },  // Angola
  { flag: '🇦🇮', dial: '1264' }, // Anguilla
  { flag: '🇦🇶', dial: '672' },  // Antarctica
  { flag: '🇦🇬', dial: '1268' }, // Antigua & Barbuda
  { flag: '🇦🇷', dial: '54' },   // Argentina
  { flag: '🇦🇲', dial: '374' },  // Armenia
  { flag: '🇦🇼', dial: '297' },  // Aruba
  { flag: '🇦🇺', dial: '61' },   // Australia
  { flag: '🇦🇹', dial: '43' },   // Austria
  { flag: '🇦🇿', dial: '994' },  // Azerbaijan
  { flag: '🇧🇸', dial: '1242' }, // Bahamas
  { flag: '🇧🇭', dial: '973' },  // Bahrain
  { flag: '🇧🇩', dial: '880' },  // Bangladesh
  { flag: '🇧🇧', dial: '1246' }, // Barbados
  { flag: '🇧🇾', dial: '375' },  // Belarus
  { flag: '🇧🇪', dial: '32' },   // Belgium
  { flag: '🇧🇿', dial: '501' },  // Belize
  { flag: '🇧🇯', dial: '229' },  // Benin
  { flag: '🇧🇲', dial: '1441' }, // Bermuda
  { flag: '🇧🇹', dial: '975' },  // Bhutan
  { flag: '🇧🇴', dial: '591' },  // Bolivia
  { flag: '🇧🇦', dial: '387' },  // Bosnia & Herzegovina
  { flag: '🇧🇼', dial: '267' },  // Botswana
  { flag: '🇧🇷', dial: '55' },   // Brazil
  { flag: '🇮🇴', dial: '246' },  // British Indian Ocean Territory
  { flag: '🇻🇬', dial: '1284' }, // British Virgin Islands
  { flag: '🇧🇳', dial: '673' },  // Brunei
  { flag: '🇧🇬', dial: '359' },  // Bulgaria
  { flag: '🇧🇫', dial: '226' },  // Burkina Faso
  { flag: '🇧🇮', dial: '257' },  // Burundi
  { flag: '🇰🇭', dial: '855' },  // Cambodia
  { flag: '🇨🇲', dial: '237' },  // Cameroon
  { flag: '🇨🇦', dial: '1' },    // Canada
  { flag: '🇨🇻', dial: '238' },  // Cape Verde
  { flag: '🇰🇾', dial: '1345' }, // Cayman Islands
  { flag: '🇨🇫', dial: '236' },  // Central African Republic
  { flag: '🇹🇩', dial: '235' },  // Chad
  { flag: '🇨🇱', dial: '56' },   // Chile
  { flag: '🇨🇳', dial: '86' },   // China
  { flag: '🇨🇴', dial: '57' },   // Colombia
  { flag: '🇰🇲', dial: '269' },  // Comoros
  { flag: '🇨🇬', dial: '242' },  // Congo - Brazzaville
  { flag: '🇨🇩', dial: '243' },  // Congo - Kinshasa
  { flag: '🇨🇷', dial: '506' },  // Costa Rica
  { flag: '🇭🇷', dial: '385' },  // Croatia
  { flag: '🇨🇺', dial: '53' },   // Cuba
  { flag: '🇨🇼', dial: '599' },  // Curaçao
  { flag: '🇨🇾', dial: '357' },  // Cyprus
  { flag: '🇨🇿', dial: '420' },  // Czech Republic
  { flag: '🇩🇰', dial: '45' },   // Denmark
  { flag: '🇩🇯', dial: '253' },  // Djibouti
  { flag: '🇩🇲', dial: '1767' }, // Dominica
  { flag: '🇩🇴', dial: '1809' }, // Dominican Republic
  { flag: '🇪🇨', dial: '593' },  // Ecuador
  { flag: '🇪🇬', dial: '20' },   // Egypt
  { flag: '🇸🇻', dial: '503' },  // El Salvador
  { flag: '🇬🇶', dial: '240' },  // Equatorial Guinea
  { flag: '🇪🇷', dial: '291' },  // Eritrea
  { flag: '🇪🇪', dial: '372' },  // Estonia
  { flag: '🇸🇿', dial: '268' },  // Eswatini
  { flag: '🇪🇹', dial: '251' },  // Ethiopia
  { flag: '🇫🇰', dial: '500' },  // Falkland Islands
  { flag: '🇫🇴', dial: '298' },  // Faroe Islands
  { flag: '🇫🇯', dial: '679' },  // Fiji
  { flag: '🇫🇮', dial: '358' },  // Finland
  { flag: '🇫🇷', dial: '33' },   // France
  { flag: '🇬🇫', dial: '594' },  // French Guiana
  { flag: '🇵🇫', dial: '689' },  // French Polynesia
  { flag: '🇬🇦', dial: '241' },  // Gabon
  { flag: '🇬🇲', dial: '220' },  // Gambia
  { flag: '🇬🇪', dial: '995' },  // Georgia
  { flag: '🇩🇪', dial: '49' },   // Germany
  { flag: '🇬🇭', dial: '233' },  // Ghana
  { flag: '🇬🇮', dial: '350' },  // Gibraltar
  { flag: '🇬🇷', dial: '30' },   // Greece
  { flag: '🇬🇱', dial: '299' },  // Greenland
  { flag: '🇬🇩', dial: '1473' }, // Grenada
  { flag: '🇬🇵', dial: '590' },  // Guadeloupe
  { flag: '🇬🇺', dial: '1671' }, // Guam
  { flag: '🇬🇹', dial: '502' },  // Guatemala
  { flag: '🇬🇬', dial: '44' },   // Guernsey
  { flag: '🇬🇳', dial: '224' },  // Guinea
  { flag: '🇬🇼', dial: '245' },  // Guinea-Bissau
  { flag: '🇬🇾', dial: '592' },  // Guyana
  { flag: '🇭🇹', dial: '509' },  // Haiti
  { flag: '🇭🇳', dial: '504' },  // Honduras
  { flag: '🇭🇰', dial: '852' },  // Hong Kong
  { flag: '🇭🇺', dial: '36' },   // Hungary
  { flag: '🇮🇸', dial: '354' },  // Iceland
  { flag: '🇮🇳', dial: '91' },   // India
  { flag: '🇮🇩', dial: '62' },   // Indonesia
  { flag: '🇮🇷', dial: '98' },   // Iran
  { flag: '🇮🇶', dial: '964' },  // Iraq
  { flag: '🇮🇪', dial: '353' },  // Ireland
  { flag: '🇮🇲', dial: '44' },   // Isle of Man
  { flag: '🇮🇱', dial: '972' },  // Israel
  { flag: '🇮🇹', dial: '39' },   // Italy
  { flag: '🇨🇮', dial: '225' },  // Ivory Coast
  { flag: '🇯🇲', dial: '1876' }, // Jamaica
  { flag: '🇯🇵', dial: '81' },   // Japan
  { flag: '🇯🇪', dial: '44' },   // Jersey
  { flag: '🇯🇴', dial: '962' },  // Jordan
  { flag: '🇰🇿', dial: '7' },    // Kazakhstan
  { flag: '🇰🇪', dial: '254' },  // Kenya
  { flag: '🇰🇮', dial: '686' },  // Kiribati
  { flag: '🇽🇰', dial: '383' },  // Kosovo
  { flag: '🇰🇼', dial: '965' },  // Kuwait
  { flag: '🇰🇬', dial: '996' },  // Kyrgyzstan
  { flag: '🇱🇦', dial: '856' },  // Laos
  { flag: '🇱🇻', dial: '371' },  // Latvia
  { flag: '🇱🇧', dial: '961' },  // Lebanon
  { flag: '🇱🇸', dial: '266' },  // Lesotho
  { flag: '🇱🇷', dial: '231' },  // Liberia
  { flag: '🇱🇾', dial: '218' },  // Libya
  { flag: '🇱🇮', dial: '423' },  // Liechtenstein
  { flag: '🇱🇹', dial: '370' },  // Lithuania
  { flag: '🇱🇺', dial: '352' },  // Luxembourg
  { flag: '🇲🇴', dial: '853' },  // Macau
  { flag: '🇲🇰', dial: '389' },  // North Macedonia
  { flag: '🇲🇬', dial: '261' },  // Madagascar
  { flag: '🇲🇼', dial: '265' },  // Malawi
  { flag: '🇲🇾', dial: '60' },   // Malaysia
  { flag: '🇲🇻', dial: '960' },  // Maldives
  { flag: '🇲🇱', dial: '223' },  // Mali
  { flag: '🇲🇹', dial: '356' },  // Malta
  { flag: '🇲🇭', dial: '692' },  // Marshall Islands
  { flag: '🇲🇶', dial: '596' },  // Martinique
  { flag: '🇲🇷', dial: '222' },  // Mauritania
  { flag: '🇲🇺', dial: '230' },  // Mauritius
  { flag: '🇾🇹', dial: '262' },  // Mayotte
  { flag: '🇲🇽', dial: '52' },   // Mexico
  { flag: '🇫🇲', dial: '691' },  // Micronesia
  { flag: '🇲🇩', dial: '373' },  // Moldova
  { flag: '🇲🇨', dial: '377' },  // Monaco
  { flag: '🇲🇳', dial: '976' },  // Mongolia
  { flag: '🇲🇪', dial: '382' },  // Montenegro
  { flag: '🇲🇸', dial: '1664' }, // Montserrat
  { flag: '🇲🇦', dial: '212' },  // Morocco
  { flag: '🇲🇿', dial: '258' },  // Mozambique
  { flag: '🇲🇲', dial: '95' },   // Myanmar
  { flag: '🇳🇦', dial: '264' },  // Namibia
  { flag: '🇳🇷', dial: '674' },  // Nauru
  { flag: '🇳🇱', dial: '31' },   // Netherlands
  { flag: '🇳🇨', dial: '687' },  // New Caledonia
  { flag: '🇳🇿', dial: '64' },   // New Zealand
  { flag: '🇳🇮', dial: '505' },  // Nicaragua
  { flag: '🇳🇪', dial: '227' },  // Niger
  { flag: '🇳🇬', dial: '234' },  // Nigeria
  { flag: '🇳🇺', dial: '683' },  // Niue
  { flag: '🇳🇫', dial: '672' },  // Norfolk Island
  { flag: '🇰🇵', dial: '850' },  // North Korea
  { flag: '🇲🇵', dial: '1670' }, // Northern Mariana Islands
  { flag: '🇳🇴', dial: '47' },   // Norway
  { flag: '🇴🇲', dial: '968' },  // Oman
  { flag: '🇵🇰', dial: '92' },   // Pakistan
  { flag: '🇵🇼', dial: '680' },  // Palau
  { flag: '🇵🇸', dial: '970' },  // Palestine
  { flag: '🇵🇦', dial: '507' },  // Panama
  { flag: '🇵🇬', dial: '675' },  // Papua New Guinea
  { flag: '🇵🇾', dial: '595' },  // Paraguay
  { flag: '🇵🇪', dial: '51' },   // Peru
  { flag: '🇵🇭', dial: '63' },   // Philippines
  { flag: '🇵🇱', dial: '48' },   // Poland
  { flag: '🇵🇹', dial: '351' },  // Portugal
  { flag: '🇵🇷', dial: '1787' }, // Puerto Rico
  { flag: '🇶🇦', dial: '974' },  // Qatar
  { flag: '🇷🇪', dial: '262' },  // Réunion
  { flag: '🇷🇴', dial: '40' },   // Romania
  { flag: '🇷🇺', dial: '7' },    // Russia
  { flag: '🇷🇼', dial: '250' },  // Rwanda
  { flag: '🇧🇱', dial: '590' },  // Saint Barthélemy
  { flag: '🇸🇭', dial: '290' },  // Saint Helena
  { flag: '🇰🇳', dial: '1869' }, // Saint Kitts & Nevis
  { flag: '🇱🇨', dial: '1758' }, // Saint Lucia
  { flag: '🇲🇫', dial: '590' },  // Saint Martin
  { flag: '🇵🇲', dial: '508' },  // Saint Pierre & Miquelon
  { flag: '🇻🇨', dial: '1784' }, // Saint Vincent & Grenadines
  { flag: '🇼🇸', dial: '685' },  // Samoa
  { flag: '🇸🇲', dial: '378' },  // San Marino
  { flag: '🇸🇹', dial: '239' },  // São Tomé & Príncipe
  { flag: '🇸🇦', dial: '966' },  // Saudi Arabia
  { flag: '🇸🇳', dial: '221' },  // Senegal
  { flag: '🇷🇸', dial: '381' },  // Serbia
  { flag: '🇸🇨', dial: '248' },  // Seychelles
  { flag: '🇸🇱', dial: '232' },  // Sierra Leone
  { flag: '🇸🇬', dial: '65' },   // Singapore
  { flag: '🇸🇰', dial: '421' },  // Slovakia
  { flag: '🇸🇮', dial: '386' },  // Slovenia
  { flag: '🇸🇧', dial: '677' },  // Solomon Islands
  { flag: '🇸🇴', dial: '252' },  // Somalia
  { flag: '🇿🇦', dial: '27' },   // South Africa
  { flag: '🇰🇷', dial: '82' },   // South Korea
  { flag: '🇸🇸', dial: '211' },  // South Sudan
  { flag: '🇪🇸', dial: '34' },   // Spain
  { flag: '🇱🇰', dial: '94' },   // Sri Lanka
  { flag: '🇸🇩', dial: '249' },  // Sudan
  { flag: '🇸🇷', dial: '597' },  // Suriname
  { flag: '🇸🇯', dial: '47' },   // Svalbard & Jan Mayen
  { flag: '🇸🇪', dial: '46' },   // Sweden
  { flag: '🇨🇭', dial: '41' },   // Switzerland
  { flag: '🇸🇾', dial: '963' },  // Syria
  { flag: '🇹🇼', dial: '886' },  // Taiwan
  { flag: '🇹🇯', dial: '992' },  // Tajikistan
  { flag: '🇹🇿', dial: '255' },  // Tanzania
  { flag: '🇹🇭', dial: '66' },   // Thailand
  { flag: '🇹🇱', dial: '670' },  // Timor-Leste
  { flag: '🇹🇬', dial: '228' },  // Togo
  { flag: '🇹🇰', dial: '690' },  // Tokelau
  { flag: '🇹🇴', dial: '676' },  // Tonga
  { flag: '🇹🇹', dial: '1868' }, // Trinidad & Tobago
  { flag: '🇹🇳', dial: '216' },  // Tunisia
  { flag: '🇹🇷', dial: '90' },   // Turkey
  { flag: '🇹🇲', dial: '993' },  // Turkmenistan
  { flag: '🇹🇨', dial: '1649' }, // Turks & Caicos Islands
  { flag: '🇹🇻', dial: '688' },  // Tuvalu
  { flag: '🇺🇬', dial: '256' },  // Uganda
  { flag: '🇺🇦', dial: '380' },  // Ukraine
  { flag: '🇦🇪', dial: '971' },  // United Arab Emirates
  { flag: '🇬🇧', dial: '44' },   // United Kingdom
  { flag: '🇺🇸', dial: '1' },    // United States
  { flag: '🇺🇾', dial: '598' },  // Uruguay
  { flag: '🇺🇿', dial: '998' },  // Uzbekistan
  { flag: '🇻🇺', dial: '678' },  // Vanuatu
  { flag: '🇻🇦', dial: '379' },  // Vatican City
  { flag: '🇻🇪', dial: '58' },   // Venezuela
  { flag: '🇻🇳', dial: '84' },   // Vietnam
  { flag: '🇼🇫', dial: '681' },  // Wallis & Futuna
  { flag: '🇪🇭', dial: '212' },  // Western Sahara
  { flag: '🇾🇪', dial: '967' },  // Yemen
  { flag: '🇿🇲', dial: '260' },  // Zambia
  { flag: '🇿🇼', dial: '263' },  // Zimbabwe
];

// Quick lookup map: dial -> flag
export const COUNTRY_FLAG_BY_DIAL: Record<string, string> = COUNTRIES.reduce(
  (acc, c) => {
    acc[c.dial] = c.flag;
    return acc;
  },
  {} as Record<string, string>
);
