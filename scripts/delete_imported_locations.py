#!/usr/bin/env python3
"""
Delete all locations that were imported via import-script.
Run with: cd scripts && uv run python delete_imported_locations.py
"""

import boto3
from boto3.dynamodb.conditions import Attr

TABLE_NAME = "christmas-lights-locations-dev"

def main():
    dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
    table = dynamodb.Table(TABLE_NAME)
    
    print(f"🗑️  Scanning for locations with createdBy='import-script'...")
    
    # Scan for all imported locations
    response = table.scan(
        FilterExpression=Attr('createdBy').eq('import-script'),
        ProjectionExpression='PK, SK, id, address'
    )
    
    items = response.get('Items', [])
    
    # Handle pagination
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            FilterExpression=Attr('createdBy').eq('import-script'),
            ProjectionExpression='PK, SK, id, address',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        items.extend(response.get('Items', []))
    
    print(f"Found {len(items)} locations to delete")
    
    if not items:
        print("Nothing to delete!")
        return
    
    # Confirm before deleting
    confirm = input(f"\n⚠️  Delete {len(items)} locations? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Aborted.")
        return
    
    # Delete in batches
    deleted = 0
    with table.batch_writer() as batch:
        for item in items:
            batch.delete_item(Key={'PK': item['PK'], 'SK': item['SK']})
            deleted += 1
            if deleted % 25 == 0:
                print(f"  Deleted {deleted}/{len(items)}...")
    
    print(f"\n✅ Deleted {deleted} locations")

if __name__ == '__main__':
    main()
