import { Button, Col, Row, Table } from 'react-bootstrap';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';
import { CiEdit } from 'react-icons/ci';
import { AiOutlineDelete } from 'react-icons/ai';
import { useEffect, useRef, useState } from 'react';
import CategoryModal, { CategoryModalHandle } from './CategoryModal';
import { showDeleteDialog } from '../util/util';
import { CategoryKind, CategoryMapping, getCategoryList } from '../../mapper/CategoryMapper';

interface ContextMenuProps {
  categoryKind: CategoryKind;
}

function Category({ categoryKind }: ContextMenuProps) {
  const categoryModalRef = useRef<CategoryModalHandle>(null);
  const [categoryMainList, setCategoryMainList] = useState<CategoryMapping[]>([]);
  const [categorySubList, setCategorySubList] = useState<CategoryMapping[] | null>(null);

  const handleDownClick = (categorySeq: number) => {
    console.log('Arrow Down clicked');
  };

  const handleUpClick = (categorySeq: number) => {
    console.log('Arrow Up clicked');
  };

  const handleAddCategory = () => {
    if (!categoryModalRef.current) {
      return;
    }

    categoryModalRef.current?.openCategoryModal(0, () => {
      console.log('add');
    });
  };

  function handleEditCategory(categorySeq: number) {
    if (!categoryModalRef.current) {
      return;
    }

    categoryModalRef.current?.openCategoryModal(categorySeq, () => {
      console.log('edit');
    });
  }

  function handleDeleteCategory(categorySeq: number) {
    showDeleteDialog(() => {
      console.log('삭제 처리');
    });
  }

  function handleCategoryMainClick(categorySeq: number) {
    setCategorySubList(getCategoryList(categoryKind, categorySeq));
  }

  useEffect(() => {
    const mainCategoryList = getCategoryList(categoryKind);
    setCategoryMainList(mainCategoryList);
  }, [categoryKind]);

  return (
    <>
      <Row>
        <Col sm={3}>
          <Table className="category">
            <tbody>
              {categoryMainList.map((category, index) => {
                return (
                  <tr key={category.categorySeq}>
                    <td>
                      <Button variant="link" onClick={() => handleCategoryMainClick(category.categorySeq)}>
                        {category.name}
                      </Button>
                    </td>
                    <td className="center">
                      {index > 0 && (
                        <Button variant="link" onClick={() => handleUpClick(category.categorySeq)}>
                          <FaArrowUp />
                        </Button>
                      )}
                      {index === 0 && <span style={{ padding: '0 7px' }}>&nbsp;</span>}
                      {index < categoryMainList.length - 1 && (
                        <Button variant="link" onClick={() => handleDownClick(category.categorySeq)}>
                          <FaArrowDown />
                        </Button>
                      )}
                      {index === categoryMainList.length - 1 && <span style={{ padding: '0 7px' }}>&nbsp;</span>}
                    </td>
                    <td className="center">
                      <Button variant="link" onClick={() => handleEditCategory(category.categorySeq)}>
                        <CiEdit />
                      </Button>
                      <Button variant="link" onClick={() => handleDeleteCategory(category.categorySeq)}>
                        <AiOutlineDelete />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Button onClick={() => handleAddCategory()} variant="outline-success" style={{ width: '100%' }}>
            추가
          </Button>
        </Col>
        {categorySubList && (
          <Col sm={3}>
            <Table className="category">
              <tbody>
                {categorySubList.map((category, index) => {
                  return (
                    <tr key={category.categorySeq}>
                      <td>{category.name}</td>
                      <td className="center">
                        {index > 0 && (
                          <Button variant="link" onClick={() => handleUpClick(category.categorySeq)}>
                            <FaArrowUp />
                          </Button>
                        )}
                        {index === 0 && <span style={{ padding: '0 7px' }}>&nbsp;</span>}
                        {index < categorySubList.length - 1 && (
                          <Button variant="link" onClick={() => handleDownClick(category.categorySeq)}>
                            <FaArrowDown />
                          </Button>
                        )}
                        {index === categorySubList.length - 1 && <span style={{ padding: '0 7px' }}>&nbsp;</span>}
                      </td>
                      <td className="center">
                        <Button variant="link" onClick={() => handleEditCategory(category.categorySeq)}>
                          <CiEdit />
                        </Button>
                        <Button variant="link" onClick={() => handleDeleteCategory(category.categorySeq)}>
                          <AiOutlineDelete />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Button onClick={handleAddCategory} variant="outline-success" style={{ width: '100%' }}>
              추가
            </Button>
          </Col>
        )}
      </Row>
      <CategoryModal ref={categoryModalRef} />
    </>
  );
}

export default Category;
