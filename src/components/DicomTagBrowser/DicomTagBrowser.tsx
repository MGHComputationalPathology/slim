// @ts-nocheck
import dcmjs from 'dcmjs';
import moment from 'moment';
import { useState, useMemo } from 'react';
import { Select, Input, Table, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './DicomTagBrowser.css';

const { DicomMetaDictionary } = dcmjs.data;
const { nameMap } = DicomMetaDictionary;
const { Option } = Select;

const DicomTagBrowser = ({ displaySets, displaySetInstanceUID }) => {
  const [selectedDisplaySetInstanceUID, setSelectedDisplaySetInstanceUID] = 
    useState(displaySetInstanceUID);
  const [instanceNumber, setInstanceNumber] = useState(1);
  const [filterValue, setFilterValue] = useState('');

  const displaySetList = useMemo(() => {
    displaySets.sort((a, b) => a.SeriesNumber - b.SeriesNumber);
    return displaySets.map(displaySet => {
      const {
        displaySetInstanceUID,
        SeriesDate,
        SeriesTime,
        SeriesNumber,
        SeriesDescription,
        Modality,
      } = displaySet;

      const dateStr = `${SeriesDate}:${SeriesTime}`.split('.')[0];
      const date = moment(dateStr, 'YYYYMMDD:HHmmss');
      const displayDate = date.format('ddd, MMM Do YYYY');

      return {
        value: displaySetInstanceUID,
        label: `${SeriesNumber} (${Modality}): ${SeriesDescription}`,
        description: displayDate,
      };
    });
  }, [displaySets]);

  const activeDisplaySet = displaySets.find(
    ds => ds.displaySetInstanceUID === selectedDisplaySetInstanceUID
  );

  const isImageStack = activeDisplaySet?.constructor.name === 'ImageSet';
  const showInstanceList = isImageStack && activeDisplaySet.images.length > 1;

  const tableData = useMemo(() => {
    let metadata;
    if (isImageStack) {
      metadata = activeDisplaySet.images[instanceNumber - 1];
    } else {
      metadata = activeDisplaySet.instance || activeDisplaySet;
    }
    
    const tags = getSortedTags(metadata);
    return tags.map((tag, index) => ({
      key: index,
      tag: `${tag.tagIndent}${tag.tag}`,
      vr: tag.vr,
      keyword: tag.keyword,
      value: tag.value || ''
    }));
  }, [instanceNumber, selectedDisplaySetInstanceUID, activeDisplaySet]);

  const columns = [
    {
      title: 'Tag',
      dataIndex: 'tag',
      key: 'tag',
      width: '20%',
    },
    {
      title: 'VR',
      dataIndex: 'vr',
      key: 'vr',
      width: '10%',
    },
    {
      title: 'Keyword',
      dataIndex: 'keyword',
      key: 'keyword',
      width: '30%',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      width: '40%',
    },
  ];

  const filteredData = filterValue
    ? tableData.filter(
        item =>
          item.tag.toLowerCase().includes(filterValue.toLowerCase()) ||
          item.keyword.toLowerCase().includes(filterValue.toLowerCase()) ||
          item.value.toString().toLowerCase().includes(filterValue.toLowerCase())
      )
    : tableData;

  return (
    <div className="dicom-tag-browser-content">
      <div className="mb-6 flex items-center">
        <div className="w-1/2 mr-4">
          <Typography.Text strong>Series</Typography.Text>
          <Select
            style={{ width: '100%' }}
            value={selectedDisplaySetInstanceUID}
            onChange={value => {
              setSelectedDisplaySetInstanceUID(value);
              setInstanceNumber(1);
            }}
          >
            {displaySetList.map(item => (
              <Option key={item.value} value={item.value}>
                {item.label}
              </Option>
            ))}
          </Select>
        </div>
        
        {showInstanceList && (
          <div className="w-1/2">
            <Typography.Text strong>Instance Number</Typography.Text>
            <Select
              style={{ width: '100%' }}
              value={instanceNumber}
              onChange={value => setInstanceNumber(value)}
            >
              {Array.from({ length: activeDisplaySet.images.length }, (_, i) => (
                <Option key={i + 1} value={i + 1}>
                  {i + 1}
                </Option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <Input
        placeholder="Search DICOM tags..."
        prefix={<SearchOutlined />}
        onChange={e => setFilterValue(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={filteredData}
        pagination={false}
        size="small"
        scroll={{ y: 400 }}
      />
    </div>
  );
};

// Helper functions for processing DICOM tags
function getSortedTags(metadata) {
  const tagList = getRows(metadata);
  return tagList.sort((a, b) => a.tag.localeCompare(b.tag));
}

function getRows(metadata, depth = 0) {
  const keywords = Object.keys(metadata).filter(key => key !== '_vrMap');
  const tagIndent = '>'.repeat(depth) + (depth > 0 ? ' ' : '');

  return keywords.flatMap(keyword => {
    const tagInfo = nameMap[keyword];
    let value = metadata[keyword];

    if (!tagInfo) {
      const regex = /[0-9A-Fa-f]{6}/g;
      if (!keyword.match(regex)) return [];
      
      return [{
        tag: `(${keyword.substring(0, 4)},${keyword.substring(4, 8)})`,
        tagIndent,
        vr: '',
        keyword: 'Private Tag',
        value: value?.toString() || '',
      }];
    }

    if (tagInfo.vr === 'SQ' && value) {
      const sequenceItems = Array.isArray(value) ? value : [value];
      return sequenceItems.flatMap((item, index) => {
        const subRows = getRows(item, depth + 1);
        return [
          {
            tag: tagInfo.tag,
            tagIndent,
            vr: tagInfo.vr,
            keyword,
            value: `Sequence Item #${index + 1}`,
          },
          ...subRows,
        ];
      });
    }

    if (Array.isArray(value)) {
      value = value.join('\\');
    }

    return [{
      tag: tagInfo.tag,
      tagIndent,
      vr: tagInfo.vr,
      keyword: keyword.replace('RETIRED_', ''),
      value: value?.toString() || '',
    }];
  });
}

export default DicomTagBrowser;
