import * as React from "react";
import { createPlugin, useInputContext, Row, Label } from "leva/plugin";
import {
  Button,
  HStack,
  Popover,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Portal,
  Box,
  Input,
  InputLeftElement,
  InputGroup,
  InputRightElement,
  SimpleGrid,
  Image,
  Center,
  Text,
  VStack,
} from "@chakra-ui/react";
import graphql from "babel-plugin-relay/macro";
import { ChakraIcon } from "../feather-icons";
import { usePagination, useQuery } from "relay-hooks";
import { levaPluginTokenImage_TokenImagesFragment$key } from "./__generated__/levaPluginTokenImage_TokenImagesFragment.graphql";
import { levaPluginTokenImage_TokenImagesQuery } from "./__generated__/levaPluginTokenImage_TokenImagesQuery.graphql";

const normalize = (opts: { value: string | null }) => opts;
const sanitize = (value: string): string => value;

const TokenImageReference = () => {
  const { displayValue, setValue } = useInputContext<any>();

  return (
    <>
      <Row input>
        <Label>Image</Label>
        <HStack alignItems="center" spacing={1}>
          {displayValue ? (
            <>
              <Box>
                <Popover isLazy placement="top-start">
                  <PopoverTrigger>
                    <Button size="xs">Change</Button>
                  </PopoverTrigger>
                  <Portal>
                    <PopoverContent width="400px">
                      <TokenImagePopoverContent
                        onSelect={(value) => setValue(value)}
                      />
                    </PopoverContent>
                  </Portal>
                </Popover>
              </Box>
              <Box>
                <Button
                  size="xs"
                  onClick={() => {
                    setValue(null);
                  }}
                >
                  Remove
                </Button>
              </Box>
            </>
          ) : (
            <Box>
              <Popover isLazy placement="top-start">
                <PopoverTrigger>
                  <Button size="xs">Add</Button>
                </PopoverTrigger>
                <Portal>
                  <PopoverContent width="400px">
                    <TokenImagePopoverContent
                      onSelect={(value) => setValue(value)}
                    />
                  </PopoverContent>
                </Portal>
              </Popover>
            </Box>
          )}
        </HStack>
      </Row>
    </>
  );
};

const TokenImagesFragment = graphql`
  fragment levaPluginTokenImage_TokenImagesFragment on Query
  @argumentDefinitions(
    count: { type: "Int", defaultValue: 20 }
    cursor: { type: "String" }
  )
  @refetchable(queryName: "levaPluginTokenImage_MoreTokenImagesQuery") {
    tokenImages(first: $count, after: $cursor)
      @connection(key: "levaPluginTokenImage_tokenImages", filters: []) {
      edges {
        node {
          id
          title
          url
        }
      }
    }
  }
`;

const TokenImagesQuery = graphql`
  query levaPluginTokenImage_TokenImagesQuery($count: Int) {
    ...levaPluginTokenImage_TokenImagesFragment @arguments(count: $count)
  }
`;

const TokenImageList = (props: {
  data: levaPluginTokenImage_TokenImagesFragment$key;
  onSelect: (tokenImageId: string) => void;
}) => {
  const { data } = usePagination(TokenImagesFragment, props.data);
  // TODO: fetch more!
  return (
    <Box height="200px" overflowY="scroll">
      <SimpleGrid columns={4} spacing={2}>
        {data.tokenImages?.edges.map((edge) => (
          <Center key={edge.node.id}>
            <VStack
              as="button"
              spacing={0}
              onClick={() => props.onSelect(edge.node.id)}
            >
              <Image
                borderRadius="full"
                boxSize="50px"
                src={edge.node.url}
                alt={edge.node.title}
              />
              <Text fontSize="xs" noOfLines={1}>
                {edge.node.title}
              </Text>
            </VStack>
          </Center>
        ))}
      </SimpleGrid>
    </Box>
  );
};

const TokenImagePopoverContent = (props: {
  onSelect: (tokenImageId: string) => void;
}) => {
  const [filter, setFilter] = React.useState("");

  const data = useQuery<levaPluginTokenImage_TokenImagesQuery>(
    TokenImagesQuery
  );
  // TODO: implement filter
  return (
    <>
      <PopoverHeader>Select Token Image</PopoverHeader>
      <PopoverCloseButton />
      <PopoverBody>
        {data.data ? (
          <TokenImageList data={data.data} onSelect={props.onSelect} />
        ) : null}
      </PopoverBody>
      <PopoverFooter>
        <HStack alignItems="center" justifyContent="flex-end" spacing={1}>
          <Box marginRight="auto" marginLeft={0}>
            <InputGroup size="xs">
              <InputLeftElement
                pointerEvents="none"
                children={<ChakraIcon.Filter color="gray.300" />}
              />
              <Input
                variant="flushed"
                placeholder="Filter"
                value={filter}
                onChange={(ev) => {
                  setFilter(ev.target.value);
                }}
              />
              <InputRightElement width="1rem">
                {filter !== "" ? (
                  <Button
                    size="xs"
                    onClick={() => setFilter("")}
                    variant="unstyled"
                  >
                    <ChakraIcon.X color="black" />
                  </Button>
                ) : null}
              </InputRightElement>
            </InputGroup>
          </Box>
        </HStack>
      </PopoverFooter>
    </>
  );
};

export const levaPluginTokenImage = createPlugin({
  normalize,
  sanitize,
  component: TokenImageReference,
});
