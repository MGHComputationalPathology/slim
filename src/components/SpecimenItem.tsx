import React from 'react'
import * as dmv from 'dicom-microscopy-viewer'
import * as dcmjs from 'dcmjs'

import Item from './Item'
import { Attribute } from './Description'
import { SpecimenPreparationStepItems } from '../data/specimens'

interface SpecimenItemProps {
  index: number
  metadata?: dmv.metadata.VLWholeSlideMicroscopyImage
  showstain: boolean
}

/**
 * React component representing a DICOM Specimen Information Entity and
 * displays specimen-related attributes of a DICOM Slide Microscopy image.
 */
class SpecimenItem extends React.Component<SpecimenItemProps, {}> {
  render (): React.ReactNode {
    if (this.props.metadata === undefined) {
      return null
    }
    const specimenDescription = this.props.metadata.SpecimenDescriptionSequence[
      this.props.index
    ]
    const attributes: Attribute[] = []
    if ('SpecimenShortDescription' in specimenDescription) {
      attributes.push({
        name: 'Description',
        value: specimenDescription.SpecimenShortDescription
      })
    }
    if ('PrimaryAnatomicStructureSequence' in specimenDescription) {
      const structures = specimenDescription.PrimaryAnatomicStructureSequence
      attributes.push({
        name: 'Anatomic Structure',
        value: structures[0].CodeMeaning
      })
    }

    // TID 8001 "Specimen Preparation"
    specimenDescription.SpecimenPreparationSequence.forEach(
      (step: dmv.metadata.SpecimenPreparation, index: number): void => {
        step.SpecimenPreparationStepContentItemSequence.forEach((
          item: (
            dcmjs.sr.valueTypes.CodeContentItem |
            dcmjs.sr.valueTypes.TextContentItem |
            dcmjs.sr.valueTypes.UIDRefContentItem |
            dcmjs.sr.valueTypes.PNameContentItem |
            dcmjs.sr.valueTypes.DateTimeContentItem
          ),
          index: number
        ) => {
          const name = new dcmjs.sr.coding.CodedConcept({
            value: item.ConceptNameCodeSequence[0].CodeValue,
            schemeDesignator:
              item.ConceptNameCodeSequence[0].CodingSchemeDesignator,
            meaning: item.ConceptNameCodeSequence[0].CodeMeaning
          })
          if (item.ValueType === dcmjs.sr.valueTypes.ValueTypes.CODE) {
            item = item as dcmjs.sr.valueTypes.CodeContentItem
            const value = new dcmjs.sr.coding.CodedConcept({
              value: item.ConceptCodeSequence[0].CodeValue,
              schemeDesignator:
                item.ConceptCodeSequence[0].CodingSchemeDesignator,
              meaning: item.ConceptCodeSequence[0].CodeMeaning
            })
            if (!name.equals(SpecimenPreparationStepItems.PROCESSING_TYPE)) {
              if (
                name.equals(SpecimenPreparationStepItems.COLLECTION_METHOD)
              ) {
                attributes.push({
                  name: 'Surgical collection',
                  value: value.CodeMeaning
                })
              } else if (
                name.equals(SpecimenPreparationStepItems.FIXATIVE)
              ) {
                attributes.push({
                  name: 'Fixative',
                  value: value.CodeMeaning
                })
              } else if (
                name.equals(SpecimenPreparationStepItems.EMBEDDING_MEDIUM)
              ) {
                attributes.push({
                  name: 'Embedding medium',
                  value: value.CodeMeaning
                })
              } else if (
                name.equals(SpecimenPreparationStepItems.STAIN) &&
                this.props.showstain
              ) {
                attributes.push({
                  name: 'Stain',
                  value: value.CodeMeaning
                })
              }
            }
          } else if (item.ValueType === dcmjs.sr.valueTypes.ValueTypes.TEXT) {
            item = item as dcmjs.sr.valueTypes.TextContentItem
            if (
              name.equals(SpecimenPreparationStepItems.STAIN) &&
              this.props.showstain
            ) {
              attributes.push({
                name: 'Stain',
                value: item.TextValue
              })
            }
          } else {
            console.debug(`specimen preparation step #${index} not rendered`)
          }
        })
      }
    )
    const uid = specimenDescription.SpecimenUID
    const identifier = specimenDescription.SpecimenIdentifier
    return (
      <Item
        uid={uid}
        key={uid}
        identifier={identifier}
        attributes={attributes}
        hasLongValues
      />
    )
  }
}

export default SpecimenItem
