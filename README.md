# Github Action to Upload to S3

This action uploads a file to S3 and also appends an entry
into a YAML file also located on S3.  Use the
[https://github.com/aws-actions/configure-aws-credentials](configure-aws-credentials)
to get access tokens.

The require config is:

- s3_bucket: s3 bucket name
- input_file: path on the local github action runner to the file to upload
- bucket_file: relative path within the bucket to which the file should be uploaded
- downloads_yml: relative path within the bucket to the YAML file to update
- type: a string which appears in the entry in the downloads_yml file

## YAML entry

The plugin appends to the end of the YAML file an entry which looks like:

```{.yaml}
 - date: ISO8601 date time
   type: the type from the action config
   name: just the filename from the bucket_file path
   bucketPath: the bucket_file path
```

The YAML file must already exist on S3. Also, note that the YAML entry is indented one space so
the initial YAML file can place the entries into a subkey.
