# -*- coding: utf-8 -*-
# Generated by the protocol buffer compiler.  DO NOT EDIT!
# source: subject_page.proto
"""Generated protocol buffer code."""
from google.protobuf import descriptor as _descriptor
from google.protobuf import descriptor_pool as _descriptor_pool
from google.protobuf import message as _message
from google.protobuf import reflection as _reflection
from google.protobuf import symbol_database as _symbol_database
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor_pool.Default().AddSerializedFile(b'\n\x12subject_page.proto\x12\x0b\x64\x61tacommons\"R\n\rEventTypeSpec\x12\n\n\x02id\x18\x01 \x01(\t\x12\x0c\n\x04name\x18\x02 \x01(\t\x12\x18\n\x10\x65vent_type_dcids\x18\x03 \x03(\t\x12\r\n\x05\x63olor\x18\x04 \x01(\t\"\xf0\x02\n\x0cPageMetadata\x12\x10\n\x08topic_id\x18\x01 \x01(\t\x12\x12\n\ntopic_name\x18\x02 \x01(\t\x12\x12\n\nplace_dcid\x18\x03 \x03(\t\x12Q\n\x15\x63ontained_place_types\x18\x04 \x03(\x0b\x32\x32.datacommons.PageMetadata.ContainedPlaceTypesEntry\x12\x45\n\x0f\x65vent_type_spec\x18\x05 \x03(\x0b\x32,.datacommons.PageMetadata.EventTypeSpecEntry\x1a:\n\x18\x43ontainedPlaceTypesEntry\x12\x0b\n\x03key\x18\x01 \x01(\t\x12\r\n\x05value\x18\x02 \x01(\t:\x02\x38\x01\x1aP\n\x12\x45ventTypeSpecEntry\x12\x0b\n\x03key\x18\x01 \x01(\t\x12)\n\x05value\x18\x02 \x01(\x0b\x32\x1a.datacommons.EventTypeSpec:\x02\x38\x01\"h\n\x0bStatVarSpec\x12\x10\n\x08stat_var\x18\x01 \x01(\t\x12\r\n\x05\x64\x65nom\x18\x02 \x01(\t\x12\x0c\n\x04unit\x18\x03 \x01(\t\x12\x0f\n\x07scaling\x18\x04 \x01(\x01\x12\x0b\n\x03log\x18\x05 \x01(\x08\x12\x0c\n\x04name\x18\x06 \x01(\t\"\xdf\x01\n\x0fRankingTileSpec\x12\x14\n\x0cshow_highest\x18\x01 \x01(\x08\x12\x13\n\x0bshow_lowest\x18\x02 \x01(\x08\x12\x15\n\rshow_increase\x18\x03 \x01(\x08\x12\x15\n\rshow_decrease\x18\x04 \x01(\x08\x12\x16\n\x0e\x64iff_base_date\x18\x05 \x01(\t\x12\x15\n\rhighest_title\x18\x06 \x01(\t\x12\x14\n\x0clowest_title\x18\x07 \x01(\t\x12\x16\n\x0eincrease_title\x18\x08 \x01(\t\x12\x16\n\x0e\x64\x65\x63rease_title\x18\t \x01(\t\"3\n\x18\x44isasterEventMapTileSpec\x12\x17\n\x0f\x65vent_type_keys\x18\x01 \x03(\t\"\x9f\x03\n\x04Tile\x12\r\n\x05title\x18\x01 \x01(\t\x12\x13\n\x0b\x64\x65scription\x18\x02 \x01(\t\x12(\n\x04type\x18\x03 \x01(\x0e\x32\x1a.datacommons.Tile.TileType\x12\x14\n\x0cstat_var_key\x18\x04 \x03(\t\x12\x39\n\x11ranking_tile_spec\x18\x05 \x01(\x0b\x32\x1c.datacommons.RankingTileSpecH\x00\x12M\n\x1c\x64isaster_event_map_tile_spec\x18\x06 \x01(\x0b\x32%.datacommons.DisasterEventMapTileSpecH\x00\"\x96\x01\n\x08TileType\x12\r\n\tTYPE_NONE\x10\x00\x12\x08\n\x04LINE\x10\x01\x12\x07\n\x03\x42\x41R\x10\x02\x12\x07\n\x03MAP\x10\x03\x12\x0b\n\x07SCATTER\x10\x04\x12\r\n\tBIVARIATE\x10\x05\x12\x0b\n\x07RANKING\x10\x06\x12\r\n\tHIGHLIGHT\x10\x07\x12\x0f\n\x0b\x44\x45SCRIPTION\x10\x08\x12\x16\n\x12\x44ISASTER_EVENT_MAP\x10\tB\x10\n\x0etile_type_spec\"\x83\x01\n\x05\x42lock\x12\r\n\x05title\x18\x01 \x01(\t\x12\x13\n\x0b\x64\x65scription\x18\x02 \x01(\t\x12*\n\x07\x63olumns\x18\x03 \x03(\x0b\x32\x19.datacommons.Block.Column\x1a*\n\x06\x43olumn\x12 \n\x05tiles\x18\x01 \x03(\x0b\x32\x11.datacommons.Tile\"\xdf\x01\n\x08\x43\x61tegory\x12\r\n\x05title\x18\x01 \x01(\t\x12\x13\n\x0b\x64\x65scription\x18\x02 \x01(\t\x12=\n\rstat_var_spec\x18\x04 \x03(\x0b\x32&.datacommons.Category.StatVarSpecEntry\x12\"\n\x06\x62locks\x18\x03 \x03(\x0b\x32\x12.datacommons.Block\x1aL\n\x10StatVarSpecEntry\x12\x0b\n\x03key\x18\x01 \x01(\t\x12\'\n\x05value\x18\x02 \x01(\x0b\x32\x18.datacommons.StatVarSpec:\x02\x38\x01\"k\n\x11SubjectPageConfig\x12+\n\x08metadata\x18\x01 \x01(\x0b\x32\x19.datacommons.PageMetadata\x12)\n\ncategories\x18\x02 \x03(\x0b\x32\x15.datacommons.Categoryb\x06proto3')



_EVENTTYPESPEC = DESCRIPTOR.message_types_by_name['EventTypeSpec']
_PAGEMETADATA = DESCRIPTOR.message_types_by_name['PageMetadata']
_PAGEMETADATA_CONTAINEDPLACETYPESENTRY = _PAGEMETADATA.nested_types_by_name['ContainedPlaceTypesEntry']
_PAGEMETADATA_EVENTTYPESPECENTRY = _PAGEMETADATA.nested_types_by_name['EventTypeSpecEntry']
_STATVARSPEC = DESCRIPTOR.message_types_by_name['StatVarSpec']
_RANKINGTILESPEC = DESCRIPTOR.message_types_by_name['RankingTileSpec']
_DISASTEREVENTMAPTILESPEC = DESCRIPTOR.message_types_by_name['DisasterEventMapTileSpec']
_TILE = DESCRIPTOR.message_types_by_name['Tile']
_BLOCK = DESCRIPTOR.message_types_by_name['Block']
_BLOCK_COLUMN = _BLOCK.nested_types_by_name['Column']
_CATEGORY = DESCRIPTOR.message_types_by_name['Category']
_CATEGORY_STATVARSPECENTRY = _CATEGORY.nested_types_by_name['StatVarSpecEntry']
_SUBJECTPAGECONFIG = DESCRIPTOR.message_types_by_name['SubjectPageConfig']
_TILE_TILETYPE = _TILE.enum_types_by_name['TileType']
EventTypeSpec = _reflection.GeneratedProtocolMessageType('EventTypeSpec', (_message.Message,), {
  'DESCRIPTOR' : _EVENTTYPESPEC,
  '__module__' : 'subject_page_pb2'
  # @@protoc_insertion_point(class_scope:datacommons.EventTypeSpec)
  })
_sym_db.RegisterMessage(EventTypeSpec)

PageMetadata = _reflection.GeneratedProtocolMessageType('PageMetadata', (_message.Message,), {

  'ContainedPlaceTypesEntry' : _reflection.GeneratedProtocolMessageType('ContainedPlaceTypesEntry', (_message.Message,), {
    'DESCRIPTOR' : _PAGEMETADATA_CONTAINEDPLACETYPESENTRY,
    '__module__' : 'subject_page_pb2'
    # @@protoc_insertion_point(class_scope:datacommons.PageMetadata.ContainedPlaceTypesEntry)
    })
  ,

  'EventTypeSpecEntry' : _reflection.GeneratedProtocolMessageType('EventTypeSpecEntry', (_message.Message,), {
    'DESCRIPTOR' : _PAGEMETADATA_EVENTTYPESPECENTRY,
    '__module__' : 'subject_page_pb2'
    # @@protoc_insertion_point(class_scope:datacommons.PageMetadata.EventTypeSpecEntry)
    })
  ,
  'DESCRIPTOR' : _PAGEMETADATA,
  '__module__' : 'subject_page_pb2'
  # @@protoc_insertion_point(class_scope:datacommons.PageMetadata)
  })
_sym_db.RegisterMessage(PageMetadata)
_sym_db.RegisterMessage(PageMetadata.ContainedPlaceTypesEntry)
_sym_db.RegisterMessage(PageMetadata.EventTypeSpecEntry)

StatVarSpec = _reflection.GeneratedProtocolMessageType('StatVarSpec', (_message.Message,), {
  'DESCRIPTOR' : _STATVARSPEC,
  '__module__' : 'subject_page_pb2'
  # @@protoc_insertion_point(class_scope:datacommons.StatVarSpec)
  })
_sym_db.RegisterMessage(StatVarSpec)

RankingTileSpec = _reflection.GeneratedProtocolMessageType('RankingTileSpec', (_message.Message,), {
  'DESCRIPTOR' : _RANKINGTILESPEC,
  '__module__' : 'subject_page_pb2'
  # @@protoc_insertion_point(class_scope:datacommons.RankingTileSpec)
  })
_sym_db.RegisterMessage(RankingTileSpec)

DisasterEventMapTileSpec = _reflection.GeneratedProtocolMessageType('DisasterEventMapTileSpec', (_message.Message,), {
  'DESCRIPTOR' : _DISASTEREVENTMAPTILESPEC,
  '__module__' : 'subject_page_pb2'
  # @@protoc_insertion_point(class_scope:datacommons.DisasterEventMapTileSpec)
  })
_sym_db.RegisterMessage(DisasterEventMapTileSpec)

Tile = _reflection.GeneratedProtocolMessageType('Tile', (_message.Message,), {
  'DESCRIPTOR' : _TILE,
  '__module__' : 'subject_page_pb2'
  # @@protoc_insertion_point(class_scope:datacommons.Tile)
  })
_sym_db.RegisterMessage(Tile)

Block = _reflection.GeneratedProtocolMessageType('Block', (_message.Message,), {

  'Column' : _reflection.GeneratedProtocolMessageType('Column', (_message.Message,), {
    'DESCRIPTOR' : _BLOCK_COLUMN,
    '__module__' : 'subject_page_pb2'
    # @@protoc_insertion_point(class_scope:datacommons.Block.Column)
    })
  ,
  'DESCRIPTOR' : _BLOCK,
  '__module__' : 'subject_page_pb2'
  # @@protoc_insertion_point(class_scope:datacommons.Block)
  })
_sym_db.RegisterMessage(Block)
_sym_db.RegisterMessage(Block.Column)

Category = _reflection.GeneratedProtocolMessageType('Category', (_message.Message,), {

  'StatVarSpecEntry' : _reflection.GeneratedProtocolMessageType('StatVarSpecEntry', (_message.Message,), {
    'DESCRIPTOR' : _CATEGORY_STATVARSPECENTRY,
    '__module__' : 'subject_page_pb2'
    # @@protoc_insertion_point(class_scope:datacommons.Category.StatVarSpecEntry)
    })
  ,
  'DESCRIPTOR' : _CATEGORY,
  '__module__' : 'subject_page_pb2'
  # @@protoc_insertion_point(class_scope:datacommons.Category)
  })
_sym_db.RegisterMessage(Category)
_sym_db.RegisterMessage(Category.StatVarSpecEntry)

SubjectPageConfig = _reflection.GeneratedProtocolMessageType('SubjectPageConfig', (_message.Message,), {
  'DESCRIPTOR' : _SUBJECTPAGECONFIG,
  '__module__' : 'subject_page_pb2'
  # @@protoc_insertion_point(class_scope:datacommons.SubjectPageConfig)
  })
_sym_db.RegisterMessage(SubjectPageConfig)

if _descriptor._USE_C_DESCRIPTORS == False:

  DESCRIPTOR._options = None
  _PAGEMETADATA_CONTAINEDPLACETYPESENTRY._options = None
  _PAGEMETADATA_CONTAINEDPLACETYPESENTRY._serialized_options = b'8\001'
  _PAGEMETADATA_EVENTTYPESPECENTRY._options = None
  _PAGEMETADATA_EVENTTYPESPECENTRY._serialized_options = b'8\001'
  _CATEGORY_STATVARSPECENTRY._options = None
  _CATEGORY_STATVARSPECENTRY._serialized_options = b'8\001'
  _EVENTTYPESPEC._serialized_start=35
  _EVENTTYPESPEC._serialized_end=117
  _PAGEMETADATA._serialized_start=120
  _PAGEMETADATA._serialized_end=488
  _PAGEMETADATA_CONTAINEDPLACETYPESENTRY._serialized_start=348
  _PAGEMETADATA_CONTAINEDPLACETYPESENTRY._serialized_end=406
  _PAGEMETADATA_EVENTTYPESPECENTRY._serialized_start=408
  _PAGEMETADATA_EVENTTYPESPECENTRY._serialized_end=488
  _STATVARSPEC._serialized_start=490
  _STATVARSPEC._serialized_end=594
  _RANKINGTILESPEC._serialized_start=597
  _RANKINGTILESPEC._serialized_end=820
  _DISASTEREVENTMAPTILESPEC._serialized_start=822
  _DISASTEREVENTMAPTILESPEC._serialized_end=873
  _TILE._serialized_start=876
  _TILE._serialized_end=1291
  _TILE_TILETYPE._serialized_start=1123
  _TILE_TILETYPE._serialized_end=1273
  _BLOCK._serialized_start=1294
  _BLOCK._serialized_end=1425
  _BLOCK_COLUMN._serialized_start=1383
  _BLOCK_COLUMN._serialized_end=1425
  _CATEGORY._serialized_start=1428
  _CATEGORY._serialized_end=1651
  _CATEGORY_STATVARSPECENTRY._serialized_start=1575
  _CATEGORY_STATVARSPECENTRY._serialized_end=1651
  _SUBJECTPAGECONFIG._serialized_start=1653
  _SUBJECTPAGECONFIG._serialized_end=1760
# @@protoc_insertion_point(module_scope)
